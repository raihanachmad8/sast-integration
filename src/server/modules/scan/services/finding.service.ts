import { logger } from '@/server/lib/logger';
import { env } from '@/server/env';
import { db } from '@/server/db/client';
import { type NewFinding, findings, findingGroups, findingGroupScans } from '@drizzle/schema/findings';
import { generateFindingFingerprint } from './finding.fingerprint';
import { FINDING_TITLE_FINGERPRINT_MAX_LENGTH, FINDING_TITLE_MESSAGE_MAX_LENGTH, SCAN } from '../constants';
import { findingRepository } from '../repositories/finding.repository';
import { AppError } from '@/server/http/errors';
import { models } from '@drizzle/schema/integrations';
import { scans } from '@drizzle/schema/scans';
import { repositories, sourceControls } from '@drizzle/schema/source-controls';
import { workspaces } from '@drizzle/schema/workspaces';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { createScmApiService } from '@/server/modules/source-control/scm-api.service';
import { buildInlineReviewComment, parseRepoName } from '@/server/modules/source-control/scm-api.service';
import type { ScmCredentials } from '@/server/modules/source-control/scm-api.service';

type NewFindingInput = Omit<NewFinding, 'id' | 'createdAt' | 'updatedAt'>;

export const findingService = {
  /**
   * Replace findings for a scan job with deduplication.
   *
   * Flow:
   * 1. Compute fingerprints (intra-batch dedup)
   * 2. Find/create groups (ON CONFLICT)
   * 3. Reopen groups with status 'resolved' → 'open'
   * 4. Insert finding records (historical)
   * 5. Mark groups without incoming fingerprint → status='resolved'
   *
   * @returns Object with counts: new, persistent, resolved, and findings array
   */
  async replaceFindingsForScanJob(projectId: string | null, scanId: string, inputs: NewFindingInput[], repositoryId?: string | null): Promise<{ new: number; persistent: number; resolved: number; findings: Array<{ id: string; groupId: string | null; isNew: boolean }> }> {
    logger.scan.info('replaceFindingsForScanJob', { projectId, repositoryId, scanId, count: inputs.length });

    return db.transaction(async (tx) => {
      if (inputs.length === 0) return { new: 0, persistent: 0, resolved: 0, findings: [] };

      // Idempotency: if findings already exist for this scan+scanner, return them without re-inserting
      // This allows multiple scanners to upload to the same scan independently
      const inputScanners = [...new Set(inputs.map((i) => i.scanner).filter(Boolean))] as string[];
      const existingFindings = inputScanners.length > 0
        ? await tx.select({ id: findings.id, groupId: findings.groupId, rule: findings.rule, filePath: findings.filePath, message: findings.message })
            .from(findings)
            .where(and(eq(findings.scanId, scanId), inArray(findings.scanner, inputScanners)))
        : [];
      if (existingFindings.length > 0) {
        // Build result from existing data
        const groupIds = existingFindings.map((f) => f.groupId).filter((id): id is string => id !== null);
        const groupStatuses = groupIds.length > 0
          ? await tx.select({ id: findingGroups.id, isNew: findingGroupScans.isNew })
            .from(findingGroups)
            .leftJoin(findingGroupScans, and(eq(findingGroupScans.groupId, findingGroups.id), eq(findingGroupScans.scanId, scanId)))
            .where(inArray(findingGroups.id, groupIds))
          : [];
        const groupMap = new Map(groupStatuses.map((g) => [g.id, g.isNew ?? true]));

        const findingsWithIsNew = existingFindings.map((f) => ({
          id: f.id,
          groupId: f.groupId,
          isNew: f.groupId ? (groupMap.get(f.groupId) ?? true) : true,
        }));
        const newCount = findingsWithIsNew.filter((f) => f.isNew).length;
        return { new: newCount, persistent: findingsWithIsNew.length - newCount, resolved: 0, findings: findingsWithIsNew };
      }

      // Step 1: Compute fingerprints (intra-batch dedup)
      const seenFingerprints = new Map<string, NewFindingInput>();
      for (const input of inputs) {
        const fp = generateFindingFingerprint({
          scanner: input.scanner ?? '',
          rule: input.rule ?? '',
          filePath: input.filePath,
          message: input.message,
        });
        if (!seenFingerprints.has(fp)) {
          seenFingerprints.set(fp, input);
        }
      }

      // Step 1.5: Get existing groups for this scan+scanner to detect resolved findings
      const existingGroupsForScan = inputScanners.length > 0
        ? await tx.select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint })
            .from(findingGroups)
            .innerJoin(findingGroupScans, eq(findingGroupScans.groupId, findingGroups.id))
            .where(and(
              eq(findingGroupScans.scanId, scanId),
              inArray(findingGroups.fingerprint, Array.from(seenFingerprints.keys())),
            ))
        : [];

      // Step 2: Batch find-or-create groups (also reopens resolved groups)
      const fingerprintEntries = Array.from(seenFingerprints.entries()).map(([fp, input]) => ({
        fingerprint: fp,
        title: input.rule || input.message?.slice(0, FINDING_TITLE_MESSAGE_MAX_LENGTH) || fp.substring(0, FINDING_TITLE_FINGERPRINT_MAX_LENGTH),
      }));
      const groupMap = await findingRepository.findOrCreateFindingGroups(projectId, repositoryId ?? null, fingerprintEntries, scanId, tx);

      // Step 3: Insert finding records (historical — no active/status columns)
      const findingsToInsert = Array.from(seenFingerprints.entries()).map(([fingerprint, input]) => ({
        scanId,
        groupId: groupMap.get(fingerprint)!.id,
        severity: input.severity ?? 'unknown',
        filePath: input.filePath ?? undefined,
        lineNumber: input.lineNumber ?? undefined,
        codeSnippet: input.codeSnippet ?? undefined,
        description: input.description ?? undefined,
        rule: input.rule ?? undefined,
        scanner: input.scanner ?? undefined,
        message: input.message ?? undefined,
        cweId: input.cweId ?? undefined,
        assignedTo: input.assignedTo ?? undefined,
      }));
      const created = await findingRepository.createMany(findingsToInsert, tx);

      // Step 4: Mark groups that were in previous scan but NOT in current batch → status='resolved'
      // These are groups that existed before this scan but their fingerprints are not in the incoming batch
      const incomingFingerprints = new Set(seenFingerprints.keys());
      const groupsPreviouslyExisting = existingGroupsForScan
        .filter((g) => !incomingFingerprints.has(g.fingerprint))
        .map((g) => g.id);
      if (groupsPreviouslyExisting.length > 0) {
        await findingRepository.updateGroupsStatusBulk(groupsPreviouslyExisting, 'resolved', tx);
      }

      // Build findings array with isNew flag from groupMap
      const findingsWithIsNew = created.map((f) => {
        const fingerprint = Array.from(seenFingerprints.entries())
          .find(([, input]) => input.rule === f.rule && input.filePath === f.filePath && input.message === f.message)?.[0];
        const group = fingerprint ? groupMap.get(fingerprint) : null;
        return {
          id: f.id,
          groupId: f.groupId,
          isNew: group?.isNew ?? true,
        };
      });

      const newCount = findingsWithIsNew.filter((f) => f.isNew).length;
      const persistentCount = findingsWithIsNew.filter((f) => !f.isNew).length;

      const result = {
        new: newCount,
        persistent: persistentCount,
        resolved: groupsPreviouslyExisting.length,
        findings: findingsWithIsNew,
      };

      logger.scan.info('replaceFindingsForScanJob completed', { projectId, scanId, ...result });
      return result;
    });
  },

  /**
   * List findings for a project with optional filters.
   */
  async list(projectId: string | undefined, workspaceId: string, filters: {
    scanId?: string;
    status?: string;
    severity?: string;
    scanner?: string;
    assignedTo?: string;
    verdict?: string;
    search?: string;
    repositoryId?: string;
    accessibleProjectIds?: string[];
    sort?: string;
    order?: 'ASC' | 'DESC';
  } = {}, limit = 50, page = 1) {
    logger.scan.debug('list', { projectId, workspaceId, filters, limit, page });

    try {
      if (filters.scanId) {
        const result = await findingRepository.listByScan(filters.scanId, {
          page,
          perPage: limit,
          status: filters.status,
          onlyNew: true,
          sort: filters.sort,
          order: filters.order,
        });
        logger.scan.debug('list completed', { projectId, total: result.total });
        return result;
      }

      if (projectId) {
        const result = await findingRepository.listByProject(projectId, {
          page,
          perPage: limit,
          severity: filters.severity,
          status: filters.status,
          scanner: filters.scanner,
          repositoryId: filters.repositoryId,
          verdict: filters.verdict,
          sort: filters.sort,
          order: filters.order,
        });
        logger.scan.debug('list completed', { projectId, total: result.total });
        return result;
      }

      if (filters.accessibleProjectIds) {
        const result = await findingRepository.listAccessible(workspaceId, filters.accessibleProjectIds, {
          page,
          perPage: limit,
          severity: filters.severity,
          status: filters.status,
          scanner: filters.scanner,
          search: filters.search,
          repositoryId: filters.repositoryId,
          verdict: filters.verdict,
          sort: filters.sort,
          order: filters.order,
        });
        logger.scan.debug('list completed', { workspaceId, accessibleProjectIds: filters.accessibleProjectIds.length, total: result.total });
        return result;
      }

      const result = await findingRepository.listByWorkspace(workspaceId, {
        page,
        perPage: limit,
        severity: filters.severity,
        status: filters.status,
        scanner: filters.scanner,
        repositoryId: filters.repositoryId,
        verdict: filters.verdict,
        sort: filters.sort,
        order: filters.order,
      });
      logger.scan.debug('list completed', { workspaceId, total: result.total });
      return result;
    } catch (error) {
      logger.scan.error('list failed', { error, projectId, workspaceId });
      throw error;
    }
  },

  /**
   * Get a single finding by ID with group info and AI verifications.
   */
  async getById(findingId: string) {
    logger.scan.debug('getById', { findingId });

    try {
      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        logger.scan.debug('getById completed', { findingId, found: false });
        return null;
      }

      // Parallel: group status + verifications (independent after finding is loaded)
      const [group, verifications] = await Promise.all([
        finding.groupId ? findingRepository.findGroupById(finding.groupId) : Promise.resolve(null),
        findingRepository.getVerifications(findingId),
      ]);
      const latestVerification = verifications[0] ?? null;

      // Parallel: model name + repo name (independent after finding/verifications are loaded)
      const [model, repo] = await Promise.all([
        latestVerification?.modelId ? this.getModelName(latestVerification.modelId) : Promise.resolve(''),
        this.getRepositoryName(finding.scanId),
      ]);

      const result = {
        id: finding.id,
        scanId: finding.scanId,
        groupId: finding.groupId,
        cweId: finding.cweId,
        severity: finding.severity,
        status: group?.status ?? 'open',
        filePath: finding.filePath,
        lineNumber: finding.lineNumber,
        codeSnippet: finding.codeSnippet,
        description: finding.description,
        rule: finding.rule,
        scanner: finding.scanner,
        message: finding.message,
        assignedTo: finding.assignedTo,
        createdAt: finding.createdAt,
        updatedAt: finding.updatedAt,
        verdict: latestVerification?.verdict === 'true_positive' ? 'TP' : latestVerification?.verdict === 'false_positive' ? 'FP' : 'Pending',
        confidence: latestVerification?.confidence ? Number(latestVerification.confidence) : null,
        model,
        explanation: latestVerification?.explanation ?? null,
        dataFlow: latestVerification?.dataFlow ?? null,
        taintSource: latestVerification?.taintSource ?? null,
        matchDetail: latestVerification?.matchDetail ?? null,
        likelyCwe: latestVerification?.likelyCwe ?? null,
        fixSuggestion: latestVerification?.fixSuggestion ?? null,
        latencyMs: latestVerification?.latencyMs ?? null,
        rawResponse: latestVerification?.rawResponse ?? null,
        file: finding.filePath ?? '',
        repo,
        cwe: finding.cweId ?? '',
        assignee: finding.assignedTo ?? null,
        lineNumberOrig: finding.lineNumber ?? 0,
      };

      logger.scan.debug('getById completed', { findingId, found: true });
      return result;
    } catch (error) {
      logger.scan.error('getById failed', { error, findingId });
      throw error;
    }
  },

  /**
   * Update finding group status and record history.
   * Operates on finding_groups, not findings.
   */
  async updateStatus(findingId: string, status: string, userId: string | null = null) {
    logger.scan.info('updateStatus', { findingId, status });

    try {
      const validStatuses = ['open', 'dismissed', 'resolved'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`, 400, SCAN.ERRORS.VALIDATION_ERROR);
      }

      // Get finding → get groupId
      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      if (!finding.groupId) {
        throw new AppError('Finding has no associated group', 400, SCAN.ERRORS.VALIDATION_ERROR);
      }

      const result = await findingRepository.updateGroupStatus(finding.groupId, status, userId);
      if (!result) {
        throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      logger.scan.info('updateStatus completed', { findingId, groupId: finding.groupId, status });
      return result;
    } catch (error) {
      logger.scan.error('updateStatus failed', { error, findingId, status });
      throw error;
    }
  },

  /**
   * Update finding verdict (accept or override AI verdict).
   * Operates on finding_groups, not findings.
   */
  async updateVerdict(findingId: string, verdict: string, userId: string | null = null) {
    logger.scan.info('updateVerdict', { findingId, verdict });

    try {
      const validVerdicts = ['true_positive', 'false_positive'];
      if (!validVerdicts.includes(verdict)) {
        throw new AppError(`Invalid verdict: ${verdict}. Must be one of: ${validVerdicts.join(', ')}`, 400, SCAN.ERRORS.VALIDATION_ERROR);
      }

      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      if (!finding.groupId) {
        throw new AppError('Finding has no associated group', 400, SCAN.ERRORS.VALIDATION_ERROR);
      }

      const status = verdict === 'true_positive' ? 'open' : 'resolved';
      const result = await findingRepository.updateGroupStatus(finding.groupId, status, userId);
      if (!result) {
        throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      // Get group fingerprint for inline comment update
      const [group] = await db.select({ fingerprint: findingGroups.fingerprint })
        .from(findingGroups)
        .where(eq(findingGroups.id, finding.groupId))
        .limit(1);

      // Update inline comments on open PRs (non-blocking, best effort)
      if (group?.fingerprint) {
        this.updateInlineCommentsForVerdict({
          fingerprint: group.fingerprint,
          findingId: findingId,
          filePath: finding.filePath,
          lineNumber: finding.lineNumber,
          scanner: finding.scanner,
          message: finding.message,
          severity: finding.severity,
          rule: finding.rule,
          groupId: finding.groupId,
        }, verdict).catch((err) => {
          logger.scan.warn('updateVerdict: inline comment update failed (non-critical)', { findingId, error: (err as Error).message });
        });
      }

      logger.scan.info('updateVerdict completed', { findingId, groupId: finding.groupId, verdict, status });
      return result;
    } catch (error) {
      logger.scan.error('updateVerdict failed', { error, findingId, verdict });
      throw error;
    }
  },

  /**
   * Update inline comments on open PRs when verdict changes.
   * Finds all open PRs that have this finding's fingerprint, rebuilds comment body,
   * and calls SCM updateInlineReviewComments.
   */
  async updateInlineCommentsForVerdict(
    finding: { fingerprint: string; findingId?: string; filePath?: string | null; lineNumber?: number | null; scanner?: string | null; message?: string | null; severity?: string | null; rule?: string | null; groupId?: string | null },
    verdict: string,
  ) {
    if (!finding.fingerprint) return;

    const verdictDisplay = verdict === 'true_positive' ? 'TP' : 'FP';

    // Find open PRs with this fingerprint via junction table + scans
    const openPrs = await db.select({
      repoName: repositories.name,
      prNumber: scans.prNumber,
      provider: sourceControls.provider,
      credentials: sourceControls.credentials,
      workspaceId: repositories.workspaceId,
    })
    .from(scans)
    .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
    .innerJoin(sourceControls, eq(repositories.workspaceId, sourceControls.workspaceId))
    .innerJoin(findingGroupScans, eq(findingGroupScans.scanId, scans.id))
    .innerJoin(findingGroups, eq(findingGroups.id, findingGroupScans.groupId))
    .where(
      and(
        eq(findingGroups.fingerprint, finding.fingerprint),
        inArray(scans.status, ['running', 'completed']),
        isNotNull(scans.prNumber),
      )
    )
    .groupBy(
      scans.prNumber,
      repositories.name,
      repositories.workspaceId,
      sourceControls.provider,
      sourceControls.credentials,
    );

    if (openPrs.length === 0) return;

    // Look up workspace slug for link
    const wsIds = [...new Set(openPrs.map(p => p.workspaceId))];
    const wsRows = await db.select({ id: workspaces.id, slug: workspaces.slug })
      .from(workspaces)
      .where(inArray(workspaces.id, wsIds));
    const slugMap = new Map(wsRows.map(r => [r.id, r.slug]));

    logger.scan.info('updateInlineCommentsForVerdict: found open PRs', {
      fingerprint: finding.fingerprint,
      prCount: openPrs.length,
    });

    const appBaseUrl = env.APP_URL;

    await Promise.all(openPrs.map(async (pr) => {
      try {
        if (!pr.credentials || !pr.provider || !pr.prNumber) return;

        const [owner, repo] = parseRepoName(pr.repoName);
        const scm = createScmApiService(pr.provider, pr.credentials as ScmCredentials);
        const wsSlug = slugMap.get(pr.workspaceId) ?? 'workspace';
        const newBody = buildInlineReviewComment({
          severity: (finding.severity ?? 'medium') as string,
          filePath: finding.filePath ?? null,
          lineNumber: finding.lineNumber ?? 0,
          rule: finding.rule ?? null,
          message: finding.message ?? null,
          scanner: finding.scanner ?? null,
          codeSnippet: null,
          aiVerdict: verdictDisplay,
          confidence: '',
          findingId: finding.findingId ?? '',
          fingerprint: finding.fingerprint,
        }, appBaseUrl, wsSlug);

        await scm.updateInlineReviewComments(owner, repo, pr.prNumber, [{
          fingerprint: finding.fingerprint,
          filePath: finding.filePath ?? '',
          lineNumber: finding.lineNumber ?? 0,
          body: newBody,
          scanner: finding.scanner ?? 'unknown',
        }]);
      } catch (err) {
        logger.scan.warn('updateInlineCommentsForVerdict: failed for PR', {
          prNumber: pr.prNumber,
          error: (err as Error).message,
        });
      }
    }));
  },

  /**
   * Assign or unassign a finding to a user.
   */
  async assign(findingId: string, assignedTo: string | null) {
    logger.scan.info('assign', { findingId, assignedTo });

    try {
      const result = await findingRepository.updateAssignment(findingId, assignedTo);
      logger.scan.info('assign completed', { findingId, assignedTo });
      return result;
    } catch (error) {
      logger.scan.error('assign failed', { error, findingId });
      throw error;
    }
  },

  /**
   * Get AI model name by ID.
   */
  async getModelName(modelId: string): Promise<string> {
    try {
      const [model] = await db.select({ name: models.name }).from(models).where(eq(models.id, modelId)).limit(1);
      return model?.name ?? '';
    } catch {
      return '';
    }
  },

  /**
   * Get repository name by scan ID.
   */
  async getRepositoryName(scanId: string): Promise<string> {
    try {
      const [result] = await db.select({ name: repositories.name })
        .from(scans)
        .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
        .where(eq(scans.id, scanId))
        .limit(1);
      return result?.name ?? '';
    } catch {
      return '';
    }
  },
};
