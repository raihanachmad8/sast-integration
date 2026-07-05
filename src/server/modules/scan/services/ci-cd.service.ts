import { randomUUID } from 'node:crypto';

import { eq, and } from 'drizzle-orm';

import { normalizeRepoName } from '@/app/api/v1/ci/normalize-repo';
import { db } from '@/server/db/client';
import { env } from '@/server/env';
import { logger } from '@/server/lib/logger';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { createScmApiService, parseRepoName, buildPrComment, buildInlineReviewComment, detectProviderFromUrl } from '@/server/modules/source-control/scm-api.service';
import type { InlineReviewComment } from '@/server/modules/source-control/scm-api.service';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { findings, findingGroupScans } from '@drizzle/schema/findings';
import { sourceControls } from '@drizzle/schema/source-controls';

import { aiVerificationRepository } from '../repositories/ai-verification.repository';
import { findingRepository } from '../repositories/finding.repository';
import { qualityGateRepository } from '../repositories/quality-gate.repository';
import { scanRepository } from '../repositories/scan.repository';

interface ScmCredentialsWithProvider {
  baseUrl: string;
  token: string;
  provider: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  sourceControlId: string;
}

interface CiInitInput {
  repoName: string;
  repoUrl?: string;
  branch?: string;
  commit?: string;
  prNumber?: number;
  baseBranch?: string;
  headBranch?: string;
  prAuthor?: string;
  platform?: string;
}

interface CiUploadInput {
  scanId?: string;
  tool: string;
  repoName: string;
  repoUrl: string;
  branch: string;
  commit: string;
  sarifContent: string;
  sarifBuffer: Buffer;
  duration: number;
}

interface CiCompleteInput {
  scanId: string;
  status?: string;
  message?: string;
  totalFindings?: number;
  totalDuration?: number;
  successRate?: number;
  tools?: string[];
  platform?: string;
  trigger?: string;
}

export const ciCdService = {
  /**
   * Get source control credentials with provider info for CI/CD API calls.
   * Centralizes the duplicated credential lookup across CI endpoints.
   *
   * @param workspaceId - Workspace UUID
   * @param preferredProvider - Optional provider filter ('github', 'gitea', 'gitlab'). If omitted, returns first available.
   * @returns Credentials with provider or null if not configured
   */
  async getCredentialsWithProvider(workspaceId: string, preferredProvider?: string): Promise<ScmCredentialsWithProvider | null> {
    let sourceControlsList = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspaceId, workspaceId));

    if (preferredProvider) {
      sourceControlsList = sourceControlsList.filter((sc) => sc.provider === preferredProvider);
    }

    const sourceControl = sourceControlsList[0];

    if (!sourceControl?.credentials) return null;

    const credentials = sourceControl.credentials as {
      baseUrl?: string;
      token?: string;
      provider?: string;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    };

    if (!credentials.baseUrl || !credentials.token) return null;

    return {
      baseUrl: credentials.baseUrl,
      token: credentials.token,
      provider: sourceControl.provider,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: credentials.refreshToken,
      sourceControlId: sourceControl.id,
    };
  },

  /**
   * Find or auto-create repository for CI/CD flows.
   * Atomic operation that handles concurrent requests safely.
   *
   * @param workspaceId - Workspace UUID
   * @param projectId - Project UUID
   * @param name - Repository name (e.g., "org/repo")
   * @param url - Repository URL
   * @param branch - Default branch name
   * @returns Repository record
   */
  async findOrCreateForCi(
    workspaceId: string,
    projectId: string,
    name: string,
    url: string,
    branch: string,
    platform?: string,
  ) {
    const repoUrl = url || `external://${name}`;
    const provider = detectProviderFromUrl(repoUrl) ?? platform;
    return repositoriesRepository.findOrCreate({
      workspaceId,
      projectId,
      name: normalizeRepoName(name, url),
      url: repoUrl,
      defaultBranch: branch,
      connectionType: ['external'],
      provider,
    });
  },

  /**
   * Initialize a CI/CD scan.
   * Creates a scan record BEFORE tools run, so all tools can upload to the same scan.
   *
   * @param workspaceId - Workspace UUID
   * @param projectId - Project UUID
   * @param input - CI init input data
   * @returns Object with scanId
   */
  async initScan(workspaceId: string, projectId: string, input: CiInitInput) {
    const { repoName, repoUrl, branch, commit, prNumber, baseBranch, headBranch, prAuthor, platform } = input;
    const resolvedBranch = branch || 'main';
    const resolvedCommit = commit || '';

    // Detect SCM provider from repo URL or explicit platform hint
    const detectedProvider = detectProviderFromUrl(repoUrl) ?? platform;
    const scmCreds = detectedProvider ? await this.getCredentialsWithProvider(workspaceId, detectedProvider) : null;
    logger.scan.info('CI/CD init: provider detected', { repoUrl, detectedProvider, hasScmConnection: !!scmCreds });

    // Find or auto-create repository (atomic)
    const repository = await this.findOrCreateForCi(workspaceId, projectId, repoName, repoUrl || '', resolvedBranch, platform);

    logger.scan.info('CI/CD init: repository resolved', { repositoryId: repository.id, name: repoName });

    // Check for existing scan by commit SHA (reuse if not terminal)
    let scan = null;
    if (resolvedCommit) {
      scan = await scanRepository.findByCommitSha(repository.id, resolvedCommit);
      if (scan && (scan.status === 'completed' || scan.status === 'failed')) {
        scan = null;
      }
    }

    if (!scan) {
      // Create scan record (status: queued)
      scan = await scanRepository.create({
        repositoryId: repository.id,
        branch: resolvedBranch,
        origin: 'external_upload',
        status: 'queued',
        commitSha: resolvedCommit,
        triggerSource: 'ci',
        prNumber: prNumber ?? null,
        baseBranch: baseBranch ?? null,
        headBranch: headBranch ?? null,
        prAuthor: prAuthor ?? null,
      });

      // Append triggered progress event
      await this.appendProgressEvent(scan.id, {
        type: 'triggered',
        description: 'CI/CD scan initiated',
      });

      logger.scan.info('CI/CD init: scan created', { scanId: scan.id });
    } else {
      logger.scan.info('CI/CD init: reusing existing scan', { scanId: scan.id, status: scan.status });
    }

    return { scanId: scan.id };
  },

  /**
   * Upload scan results from CI/CD pipeline.
   * Handles both new pattern (with scanId) and legacy pattern (without scanId).
   *
   * @param workspaceId - Workspace UUID
   * @param projectId - Project UUID
   * @param input - CI upload input data
   * @returns Object with scanId and findingsCount
   */
  async uploadScan(workspaceId: string, projectId: string, input: CiUploadInput) {
    const { scanId: scanIdField, tool, repoName, repoUrl, branch, commit, sarifContent, sarifBuffer, duration } = input;

    let scan;

    if (scanIdField) {
      // NEW PATTERN: scanId provided (from /ci/init)
      scan = await scanRepository.getById(scanIdField);
      if (!scan) {
        throw new Error('Scan not found');
      }

      // IDOR protection: ensure scan belongs to the authenticated workspace
      if (scan.repositoryId) {
        const repository = await repositoriesRepository.getById(workspaceId, scan.repositoryId);
        if (!repository) {
          throw new Error('Scan not found');
        }
      }

      // Update status to processing if still queued
      if (scan.status === 'queued') {
        await scanRepository.updateStatus(scan.id, 'processing');
      }
    } else {
      // LEGACY PATTERN: no scanId
      const repository = await this.findOrCreateForCi(workspaceId, projectId, repoName, repoUrl, branch);

      scan = await scanRepository.findByCommitSha(repository.id, commit);

      if (!scan) {
        scan = await scanRepository.create({
          repositoryId: repository.id,
          branch,
          origin: 'external_upload',
          status: 'processing',
          commitSha: commit,
          triggerSource: 'ci',
        });
      }
    }

    // Parse findings (imported from caller)
    const { parseScanResult } = await import('@/server/modules/scan/parsers');
    const result = parseScanResult(tool, sarifContent, scan.id);

    // Store findings with dedup
    const { findingService } = await import('./finding.service');
    let storedFindings: Array<{ id: string; groupId: string | null; isNew: boolean }> = [];
    if (result.findings.length > 0) {
      const findingResult = await findingService.replaceFindingsForScanJob(
        projectId,
        scan.id,
        result.findings,
        scan.repositoryId ?? null,
      );
      storedFindings = findingResult.findings ?? [];
    }

    // Store SARIF to storage for audit/re-parse
    let fileKey = '';
    try {
      const { getStorageDriver } = await import('@/server/modules/storage/storage.service');
      const storage = await getStorageDriver();
      fileKey = `${scan.id}/${tool}-${Date.now()}.sarif`;
      await storage.upload(sarifBuffer, fileKey, { contentType: 'application/sarif+json' });
    } catch (err) {
      logger.scan.error('CI/CD upload: failed to store SARIF', { scanId: scan.id, tool, error: (err as Error).message });
    }

    // Append scanning progress event
    await this.appendProgressEvent(scan.id, {
      type: 'scanning',
      description: `${tool} uploaded (${storedFindings.length} findings)`,
      scanner: tool,
      ...(duration > 0 ? { durationSeconds: duration } : {}),
    });

    // Record scan result
    await scanRepository.createScanResult({
      scanId: scan.id,
      scanner: tool,
      format: 'sarif',
      fileKey: fileKey || `ci/${tool}-${Date.now()}.sarif`,
      fileSize: sarifBuffer.length,
      parsedSummary: result.summary,
    });

    // LEGACY PATTERN: mark completed if no scanId was provided
    if (!scanIdField) {
      await scanRepository.updateStatus(scan.id, 'completed');
      await this.appendProgressEvent(scan.id, {
        type: 'completed',
        description: 'Scan completed',
      });
    }

    logger.scan.info('CI/CD upload completed', {
      scanId: scan.id,
      tool,
      findingsCount: storedFindings.length,
    });

    return { scanId: scan.id, findingsCount: storedFindings.length };
  },

  /**
   * Complete a CI/CD scan.
   * Updates status, evaluates quality gate, posts PR comments, and sets commit status.
   *
   * @param workspaceId - Workspace UUID
   * @param projectId - Project UUID
   * @param input - CI complete input data
   * @returns Completion result with quality gate and SCM action results
   */
  async completeScan(workspaceId: string, projectId: string, input: CiCompleteInput) {
    const { scanId, status, message, totalFindings, totalDuration, successRate, tools, platform, trigger } = input;

    const scan = await scanRepository.getById(scanId);
    if (!scan) {
      throw new Error('Scan not found');
    }

    // IDOR protection
    if (scan.repositoryId) {
      const repository = await repositoriesRepository.getById(workspaceId, scan.repositoryId);
      if (!repository) {
        throw new Error('Scan not found');
      }
    }

    // Idempotency: skip if scan already in terminal state
    if (scan.status === 'completed' || scan.status === 'failed') {
      return { scanId, status: scan.status, skipped: true };
    }

    // 1. Update scan status
    const validStatuses = ['completed', 'failed'];
    const scanStatus = status && validStatuses.includes(status) ? status : 'completed';
    await scanRepository.updateStatus(scanId, scanStatus);

    // 2. Append completion event
    await this.appendProgressEvent(scanId, {
      type: 'completed',
      description: message || 'CI/CD scan completed',
    });

    // 3. Store summary
    await scanRepository.createScanResult({
      scanId,
      scanner: 'ci-cd',
      format: 'json',
      parsedSummary: { totalFindings, totalDuration, successRate, tools, platform, trigger },
    });

    // 4. Evaluate quality gate
    const { qualityGateService } = await import('./quality-gate.service');
    let gateResult = null;
    const hasPrFields = !!(scan.prNumber && scan.baseBranch && scan.headBranch && scan.repositoryId);

    if (hasPrFields) {
      gateResult = await qualityGateService.evaluatePrScan(workspaceId, scanId, scan.repositoryId!, scan.headBranch!, scan.baseBranch!);
    } else if (projectId) {
      gateResult = await qualityGateService.evaluateScan(workspaceId, scanId, projectId);
    }

    // 4b. Queue AI verification for NEW findings first, then pre-existing if not yet verified
    if (scan.repositoryId) {
      await this.enqueueAiVerification(scanId, workspaceId, scan.prNumber ?? 0, scan.repositoryId, gateResult ? { newFindingsData: gateResult.newFindingsData } : {});
    }

    // 5. Post inline comments
    let inlineCommentsResult = null;
    if (scan.prNumber && scan.headBranch && scan.baseBranch && scan.repositoryId) {
      try {
        inlineCommentsResult = await this.postInlineComments(scanId, workspaceId, scan, gateResult);
      } catch (err) {
        logger.scan.error('CI/CD inline comments failed (non-critical)', { scanId, error: this.sanitizeError(err as Error) });
      }
    }

    // 6. Post PR comment + commit status
    let prCommentResult = null;
    let commitStatusResult = null;
    if (scan.prNumber && scan.headBranch && scan.baseBranch && scan.repositoryId) {
      try {
        const scmResult = await this.postPrCommentAndCommitStatus(scanId, workspaceId, scan, gateResult);
        prCommentResult = scmResult.prComment;
        commitStatusResult = scmResult.commitStatus;
      } catch (err) {
        logger.scan.error('CI/CD SCM actions failed (non-critical)', { scanId, error: this.sanitizeError(err as Error) });
      }
    }

    return {
      scanId,
      status: scanStatus,
      qualityGate: gateResult ? {
        status: gateResult.status,
        newFindings: (gateResult as { pr?: { newFindings?: number } }).pr?.newFindings ?? 0,
        fixedFindings: (gateResult as { pr?: { fixedFindings?: number } }).pr?.fixedFindings ?? 0,
        persistentFindings: (gateResult as { result?: { persistentFindings?: number } }).result?.persistentFindings ?? 0,
        blockingFindings: gateResult.findings.blocking,
        pendingFindings: gateResult.findings.pending,
      } : null,
      prComment: prCommentResult,
      inlineComments: inlineCommentsResult,
      commitStatus: commitStatusResult,
    };
  },

  /**
   * Append a progress event to a scan.
   */
  async appendProgressEvent(scanId: string, event: { type: string; description: string; scanner?: string; durationSeconds?: number }) {
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      ...event,
      timestamp: new Date().toISOString(),
    } as Parameters<typeof scanRepository.appendProgressEvent>[1]);
  },

  /**
   * Enqueue AI verification for new findings on PR.
   */
  async enqueueAiVerification(
    scanId: string,
    workspaceId: string,
    _prNumber: number,
    _repositoryId: string,
    _gateResult: { newFindingsData?: Array<{ id?: string; groupId?: string | null }> },
  ) {
    try {
      const { enqueue } = await import('@/server/modules/queue/queue.service');

      const model = await aiVerificationRepository.getPrimaryModel();
      if (!model) return;

      // Get ALL findings for this scan with their isNew status from junction table
      const allFindings = await db.select({
        findingId: findings.id,
        groupId: findingGroupScans.groupId,
        isNew: findingGroupScans.isNew,
      })
        .from(findingGroupScans)
        .innerJoin(findings, and(
          eq(findings.groupId, findingGroupScans.groupId),
          eq(findings.scanId, findingGroupScans.scanId),
        ))
        .where(eq(findingGroupScans.scanId, scanId));

      if (allFindings.length === 0) return;

      // Dedup: skip groups already verified (confidence > 80)
      const groupIds = [...new Set(allFindings.map((f) => f.groupId).filter(Boolean))] as string[];
      const verifiedGroupIds = new Set<string>();
      if (groupIds.length > 0) {
        const verifiedGroups = await aiVerificationRepository.hasVerificationBatch(groupIds);
        verifiedGroups.forEach((id) => verifiedGroupIds.add(id));
      }

      // Priority 1: NEW findings (isNew=true) that don't have verification
      const newFindingsToVerify = allFindings.filter((f) => {
        if (!f.findingId) return false;
        if (!f.isNew) return false;
        if (f.groupId && verifiedGroupIds.has(f.groupId)) return false;
        return true;
      });

      // Priority 2: Pre-existing findings (isNew=false) that don't have verification yet
      const preExistingToVerify = allFindings.filter((f) => {
        if (!f.findingId) return false;
        if (f.isNew) return false; // Already handled above
        if (f.groupId && verifiedGroupIds.has(f.groupId)) return false;
        return true;
      });

      // Enqueue NEW findings first, then pre-existing
      const toVerify = [...newFindingsToVerify, ...preExistingToVerify];

      for (const finding of toVerify) {
        if (!finding.findingId) continue;
        await enqueue('ai-verify-finding', {
          findingId: finding.findingId,
          scanId,
          modelId: model.id,
          workspaceId,
        }, { retryLimit: 5, retryDelay: 30 });
      }

      logger.scan.info('CI/CD complete: AI verification enqueued', {
        scanId,
        totalFindings: allFindings.length,
        newToVerify: newFindingsToVerify.length,
        preExistingToVerify: preExistingToVerify.length,
        skippedGroups: verifiedGroupIds.size,
      });
    } catch (err) {
      logger.scan.error('CI/CD complete: AI verification enqueue failed (non-critical)', { scanId, error: (err as Error).message });
    }
  },

  /**
   * Post inline review comments for new findings.
   */
  async postInlineComments(
    scanId: string,
    workspaceId: string,
    scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null; prNumber: number | null },
    gateResult: { status: string; newFindingsData?: unknown[] } | null,
  ): Promise<{ created: number; updated: number } | null> {
    if (!scan.repositoryId || !scan.headBranch || !scan.baseBranch || !scan.prNumber) return null;

    const repository = await repositoriesRepository.getById(workspaceId, scan.repositoryId);
    if (!repository) return null;

    const scmCreds = await this.getCredentialsWithProvider(workspaceId, repository.provider ?? undefined);
    if (!scmCreds) return null;

    const scm = this.createScmClient(scmCreds);
    const [owner, repo] = parseRepoName(repository.name);

    const ws = await workspaceRepository.findById(workspaceId);
    const workspaceSlug = ws?.slug ?? 'workspace';

    const newFindings = await this.resolveNewFindings(scan, gateResult);

    // Dedup by fingerprint
    const seenFingerprints = new Set<string>();
    const uniqueFindings = newFindings.filter((f) => {
      if (!f.filePath || !f.lineNumber || !f.findingId || !f.fingerprint) return false;
      if (seenFingerprints.has(f.fingerprint)) return false;
      seenFingerprints.add(f.fingerprint);
      return true;
    });

    // Resolve fixed finding threads
    try {
      const fixedFingerprints = (gateResult as { fixedFingerprints?: string[] })?.fixedFingerprints;
      if (fixedFingerprints && fixedFingerprints.length > 0) {
        const resolveResult = await scm.resolveInlineReviewComments(owner, repo, scan.prNumber, fixedFingerprints);
        logger.scan.info('CI/CD: resolved finding threads', { scanId, resolved: resolveResult.resolved, failed: resolveResult.failed });
      }
    } catch (err) {
      logger.scan.warn('CI/CD: resolve threads failed (non-critical)', { scanId, error: (err as Error).message });
    }

    if (uniqueFindings.length === 0) return { created: 0, updated: 0 };

    const existingFingerprints = await scm.listExistingInlineFingerprints(owner, repo, scan.prNumber);
    const newOnlyFindings = uniqueFindings.filter((f) => !existingFingerprints.has(f.fingerprint));

    if (newOnlyFindings.length === 0) {
      logger.scan.info('CI/CD: all inline findings already have comments, skipping', { scanId });
      return { created: 0, updated: 0 };
    }

    const appBaseUrl = env.APP_URL;
    const inlineComments: InlineReviewComment[] = newOnlyFindings.map((f) => ({
      filePath: f.filePath!,
      lineNumber: f.lineNumber!,
      body: buildInlineReviewComment(f, appBaseUrl, workspaceSlug),
      severity: f.severity,
      findingId: f.findingId,
      fingerprint: f.fingerprint,
      scanner: f.scanner,
    }));

    return await scm.postInlineReviewComments(owner, repo, scan.prNumber, scanId, inlineComments);
  },

  /**
   * Post PR summary comment and set commit status.
   */
  async postPrCommentAndCommitStatus(
    scanId: string,
    workspaceId: string,
    scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null; prNumber: number | null; commitSha: string | null },
    gateResult: { status: string; newFindings?: number; fixedFindings?: number; blockingFindings?: number } | null,
  ): Promise<{
    prComment: { action: 'created' | 'updated'; prNumber: number } | null;
    commitStatus: { status: string; context: string } | null;
  }> {
    const COMMIT_STATUS_CONTEXT = 'sast-integration/gate';

    if (!scan.repositoryId || !scan.headBranch || !scan.baseBranch || !scan.prNumber) {
      return { prComment: null, commitStatus: null };
    }

    const repository = await repositoriesRepository.getById(workspaceId, scan.repositoryId);
    if (!repository) return { prComment: null, commitStatus: null };

    const scmCreds = await this.getCredentialsWithProvider(workspaceId, repository.provider ?? undefined);
    if (!scmCreds) return { prComment: null, commitStatus: null };

    const scm = this.createScmClient(scmCreds);
    const [owner, repo] = parseRepoName(repository.name);

    const ws = await workspaceRepository.findById(workspaceId);
    const workspaceSlug = ws?.slug ?? 'workspace';

    // Post PR summary comment
    let prCommentResult = null;
    try {
      const gateDb = await qualityGateRepository.getResultByScanId(scanId);
      const gateStatus = gateDb?.status ?? gateResult?.status ?? 'pending';
      const newCount = gateDb?.newFindings ?? gateResult?.newFindings ?? 0;
      const fixedCount = gateDb?.fixedFindings ?? gateResult?.fixedFindings ?? 0;
      const blockingCount = gateDb?.blockingFindings ?? gateResult?.blockingFindings ?? 0;
      const persistentCount = gateDb?.persistentFindings ?? 0;

      const statusCounts = await findingRepository.countGroupsByStatusForScan(scanId);
      const dismissedCount = statusCounts.dismissed;
      const resolvedCount = statusCounts.resolved;

      const newFindingsForComment = await this.resolveNewFindings(scan, gateResult);

      const appBaseUrl = env.APP_URL;
      const commentBody = buildPrComment(
        scanId, gateStatus, newCount, fixedCount, blockingCount, newFindingsForComment, appBaseUrl, persistentCount, workspaceSlug, dismissedCount, resolvedCount,
      );

      const action = await scm.postOrUpdatePrComment(owner, repo, scan.prNumber, scanId, commentBody);
      prCommentResult = { action, prNumber: scan.prNumber };
    } catch (err) {
      logger.scan.error('PR comment failed', { scanId, error: this.sanitizeError(err as Error) });
    }

    // Set commit status
    let commitStatusResult = null;
    if (scan.commitSha) {
      try {
        const gateStatus = gateResult?.status ?? 'pending';
        const commitStatus = gateStatus === 'passed' ? 'success' : gateStatus === 'failed' ? 'failure' : 'pending';
        const description = gateStatus === 'passed' ? 'SAST quality gate passed' : `SAST quality gate ${gateStatus}`;
        const appBaseUrl = env.APP_URL;
        const targetUrl = `${appBaseUrl}/workspace/scan/${scanId}`;

        await scm.createCommitStatus(owner, repo, scan.commitSha, {
          status: commitStatus,
          description,
          context: COMMIT_STATUS_CONTEXT,
          targetUrl,
        });
        commitStatusResult = { status: commitStatus, context: COMMIT_STATUS_CONTEXT };
      } catch (err) {
        logger.scan.error('Commit status failed', { scanId, error: this.sanitizeError(err as Error) });
      }
    }

    return { prComment: prCommentResult, commitStatus: commitStatusResult };
  },

  // ─── Shared helpers ─────────────────────────────────────────────────────

  /**
   * Sanitize error message to prevent credential leakage in logs.
   * Strips token, clientSecret, refreshToken from error messages.
   */
  sanitizeError(err: Error): string {
    let msg = err.message;
    const sensitivePatterns = [/token[=:]\s*\S+/gi, /secret[=:]\s*\S+/gi, /password[=:]\s*\S+/gi];
    for (const pattern of sensitivePatterns) {
      msg = msg.replace(pattern, '[REDACTED]');
    }
    return msg;
  },

  /**
   * Create an SCM API client from credentials.
   * Purpose: Eliminates repeated credential→client boilerplate across methods.
   */
  createScmClient(creds: ScmCredentialsWithProvider) {
    return createScmApiService(creds.provider, {
      baseUrl: creds.baseUrl,
      token: creds.token,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken: creds.refreshToken,
      sourceControlId: creds.sourceControlId,
    });
  },

  /**
   * Resolve new findings for a scan from gate result or code diff.
   * Purpose: Single source of truth for finding→comment mapping used in
   * both inline comments and PR summary comment.
   */
  async resolveNewFindings(
    scan: { repositoryId: string | null; headBranch: string | null; baseBranch: string | null },
    gateResult: { status: string; newFindings?: number; fixedFindings?: number; blockingFindings?: number; newFindingsData?: unknown[] } | null,
  ) {
    const precomputedFindings = gateResult?.newFindingsData;
    const diffData = precomputedFindings !== undefined && precomputedFindings !== null
      ? precomputedFindings
      : (await findingRepository.diffNewFindings(
          scan.repositoryId!, scan.headBranch!, scan.baseBranch!, {}, { page: 1, perPage: 1000 },
        )).data;

    return diffData.map((f) => {
      const rec = f as Record<string, unknown>;
      return {
        severity: (rec.severity as string) ?? 'medium',
        filePath: rec.filePath as string,
        lineNumber: rec.lineNumber as number,
        rule: rec.rule as string,
        message: rec.message as string,
        scanner: rec.scanner as string,
        codeSnippet: rec.codeSnippet as string ?? null,
        aiVerdict: rec.aiVerdict as string ?? null,
        confidence: String(rec.confidence ?? ''),
        findingId: (rec.id ?? rec.findingId) as string,
        fingerprint: rec.fingerprint as string,
      };
    });
  },
};
