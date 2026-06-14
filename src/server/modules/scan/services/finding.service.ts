import { logger } from '@/server/lib/logger';
import { db } from '@/server/db/client';
import { type NewFinding } from '@drizzle/schema/findings';
import { generateFindingFingerprint } from './finding.fingerprint';
import { FINDING_TITLE_FINGERPRINT_MAX_LENGTH, FINDING_TITLE_MESSAGE_MAX_LENGTH, SCAN } from '../constants';
import { findingRepository } from '../repositories/finding.repository';
import { AppError } from '@/server/http/errors';

type NewFindingInput = Omit<NewFinding, 'id' | 'createdAt' | 'updatedAt'>;

export const findingService = {
  /**
   * Replace findings for a scan job with deduplication.
   *
   * Within a single transaction:
   * 1. Loads all previous active findings for the same project
   * 2. Marks superseded findings (same fingerprint) as inactive
   * 3. Marks resolved findings (fingerprint not in new set) as inactive with status 'fixed'
   * 4. Inserts new findings as active
   *
   * This ensures only the latest scan's findings are "active" at any time.
   *
   * @param projectId - Project UUID for group scoping (optional if repositoryId provided)
   * @param scanId - Scan UUID these findings belong to
   * @param inputs - Array of normalized findings from any parser
   * @returns Object with counts: new, persistent, resolved, and findings array
   */
  async replaceFindingsForScanJob(projectId: string | null, scanId: string, inputs: NewFindingInput[], repositoryId?: string | null): Promise<{ new: number; persistent: number; resolved: number; findings: Array<{ id: string }> }> {
    logger.scan.info('replaceFindingsForScanJob', { projectId, repositoryId, scanId, count: inputs.length });

    return db.transaction(async (tx) => {
      if (inputs.length === 0) return { new: 0, persistent: 0, resolved: 0, findings: [] };

      // Determine scanner name from first input (all inputs in a batch are from the same scanner)
      const scannerName = inputs[0]?.scanner;

      // Step 1: Compute fingerprints for all incoming findings
      const incomingFingerprints = new Map<string, NewFindingInput>();
      for (const input of inputs) {
        const fp = generateFindingFingerprint({
          rule: input.rule ?? '',
          filePath: input.filePath,
          lineNumber: input.lineNumber,
          message: input.message,
        });
        incomingFingerprints.set(fp, input);
      }

      // Step 2: Load previous active findings for dedup (project-scoped or repo-scoped)
      const previousActiveFindings = (projectId || repositoryId)
        ? await findingRepository.listActiveFindingsByProject(projectId ?? null, repositoryId ?? null, scanId, scannerName ?? undefined, tx)
        : [];

      // Step 3: Separate into superseded (same fingerprint) and resolved (not in new set)
      const supersededIds: string[] = [];
      const resolvedIds: string[] = [];

      for (const prev of previousActiveFindings) {
        if (!prev.fingerprint) continue;
        if (incomingFingerprints.has(prev.fingerprint)) {
          supersededIds.push(prev.id);
        } else {
          resolvedIds.push(prev.id);
        }
      }

      // Step 4: Mark superseded findings as inactive
      await findingRepository.markSupersededBulk(supersededIds, tx);

      // Step 5: Mark resolved findings as inactive with status 'fixed'
      await findingRepository.markResolvedBulk(resolvedIds, tx);

      // Step 6: Batch find-or-create all finding groups
      const fingerprintEntries = Array.from(incomingFingerprints.entries()).map(([fp, input]) => ({
        fingerprint: fp,
        title: input.rule || input.message?.slice(0, FINDING_TITLE_MESSAGE_MAX_LENGTH) || fp.substring(0, FINDING_TITLE_FINGERPRINT_MAX_LENGTH),
      }));
      const groupMap = await findingRepository.findOrCreateFindingGroups(projectId, repositoryId ?? null, fingerprintEntries, tx);

      // Step 7: Batch insert all new findings (filter null values for Drizzle compatibility)
      const findingsToInsert = Array.from(incomingFingerprints.entries()).map(([fingerprint, input]) => ({
        scanId,
        groupId: groupMap.get(fingerprint)!.id,
        active: true,
        severity: input.severity ?? 'unknown',
        status: input.status ?? undefined,
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

      const result = {
        new: created.length,
        persistent: supersededIds.length,
        resolved: resolvedIds.length,
        findings: created, // Return created findings with IDs
      };

      logger.scan.info('replaceFindingsForScanJob completed', { projectId, scanId, ...result });
      return result;
    });
  },

  /**
   * List findings for a project with optional filters.
   *
   * @param projectId - Project UUID for data isolation
   * @param filters - Optional filter criteria (severity, status, scanner, scanId, assignedTo)
   * @param limit - Maximum results (default 50)
   * @param page - Page number (default 1)
   * @returns Paginated finding list with group info
   */
  async list(projectId: string | undefined, workspaceId: string, filters: {
    scanId?: string;
    status?: string;
    severity?: string;
    scanner?: string;
    assignedTo?: string;
  } = {}, limit = 50, page = 1) {
    logger.scan.debug('list', { projectId, workspaceId, filters, limit, page });

    try {
      // If scanId is provided, use listByScan instead
      if (filters.scanId) {
        const result = await findingRepository.listByScan(filters.scanId, {
          page,
          perPage: limit,
          status: filters.status,
        });
        logger.scan.debug('list completed', { projectId, total: result.total });
        return result;
      }

      // If projectId is provided, filter by project; otherwise filter by workspace
      if (projectId) {
        const result = await findingRepository.listByProject(projectId, {
          page,
          perPage: limit,
          severity: filters.severity,
          status: filters.status,
          scanner: filters.scanner,
        });
        logger.scan.debug('list completed', { projectId, total: result.total });
        return result;
      }

      const result = await findingRepository.listByWorkspace(workspaceId, {
        page,
        perPage: limit,
        severity: filters.severity,
        status: filters.status,
        scanner: filters.scanner,
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
   *
   * @param findingId - Finding UUID
   * @returns Finding record with aiVerifications, or null if not found
   */
  async getById(findingId: string) {
    logger.scan.debug('getById', { findingId });

    try {
      const finding = await findingRepository.findById(findingId);
      if (!finding) {
        logger.scan.debug('getById completed', { findingId, found: false });
        return null;
      }

      const verifications = await findingRepository.getVerifications(findingId);
      const latestVerification = verifications[0] ?? null;

      // Map DB fields to domain fields
      const result = {
        id: finding.id,
        scanId: finding.scanId,
        groupId: finding.groupId,
        cweId: finding.cweId,
        severity: finding.severity,
        status: finding.status,
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
        // AI verification mapped fields
        verdict: latestVerification?.verdict === 'true_positive' ? 'TP' : latestVerification?.verdict === 'false_positive' ? 'FP' : 'Pending',
        confidence: latestVerification?.confidence ? Number(latestVerification.confidence) : null,
        model: '', // Will be populated by caller if needed
        explanation: latestVerification?.explanation ?? null,
        dataFlow: latestVerification?.dataFlow ?? null,
        taintSource: latestVerification?.taintSource ?? null,
        matchDetail: latestVerification?.matchDetail ?? null,
        likelyCwe: latestVerification?.likelyCwe ?? null,
        fixSuggestion: latestVerification?.fixSuggestion ?? null,
        latencyMs: latestVerification?.latencyMs ?? null,
        rawResponse: latestVerification?.rawResponse ?? null,
        // Legacy fields for backward compatibility
        file: finding.filePath ?? '',
        repo: '',
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
   * Update finding status and record history.
   *
   * Valid statuses: open, fixed, false_positive, ignored
   *
   * @param findingId - Finding UUID
   * @param status - New status value
   * @param userId - User UUID who performed the change (null for system/automated)
   * @returns Updated finding record
   */
  async updateStatus(findingId: string, status: string, userId: string | null = null) {
    logger.scan.info('updateStatus', { findingId, status });

    try {
      const validStatuses = ['open', 'fixed', 'false_positive', 'ignored'];
      if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`, 400, SCAN.ERRORS.VALIDATION_ERROR);
      }

      const result = await findingRepository.updateStatus(findingId, status, userId);
      if (!result) {
        throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      }

      logger.scan.info('updateStatus completed', { findingId, status });
      return result;
    } catch (error) {
      logger.scan.error('updateStatus failed', { error, findingId, status });
      throw error;
    }
  },

  /**
   * Assign or unassign a finding to a user.
   *
   * @param findingId - Finding UUID
   * @param assignedTo - User UUID to assign to (null to unassign)
   * @returns Updated finding record
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
};
