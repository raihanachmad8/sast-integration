import { logger } from '@/server/lib/logger';
import { scanRepository } from './repositories/scan.repository';
import { findingRepository } from './repositories/finding.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { SCAN } from './constants';
import type { ProgressEvent } from '@drizzle/schema/scans';

/** Map raw scan DB row to frontend ScanRow shape */
function toScanRow(row: Awaited<ReturnType<typeof scanRepository.listByWorkspace>>['data'][number]) {
  const findingsCount = Number(row.findingsCount) || 0;
  const criticalCount = Number(row.criticalCount) || 0;
  const aiVerifiedCount = Number(row.aiVerifiedCount) || 0;

  // Format AI column: "12/15" means 12 verified out of 15 total, or "—" if no findings
  let aiDisplay = '—';
  if (findingsCount > 0) {
    aiDisplay = `${aiVerifiedCount}/${findingsCount}`;
  }

  // Calculate duration
  let durationSeconds: number | undefined;
  if (row.startedAt && row.completedAt) {
    durationSeconds = Math.floor((row.completedAt.getTime() - row.startedAt.getTime()) / 1000);
  }

  // Map DB status to display label — never collapse intermediate states
  const statusMap: Record<string, 'Queued' | 'Running' | 'Processing' | 'Parsing' | 'Completed' | 'Failed'> = {
    queued: 'Queued',
    running: 'Running',
    processing: 'Processing',
    parsing: 'Parsing',
    completed: 'Completed',
    failed: 'Failed',
  };

  return {
    id: row.id,
    repository: row.repositoryName ?? 'Unknown',
    repoSub: row.branch ?? 'main',
    status: statusMap[row.status ?? 'queued'] ?? 'Queued',
    stage: row.status ?? 'queued',
    findings: findingsCount,
    critical: criticalCount,
    ai: aiDisplay,
    origin: (row.origin ?? 'managed') as 'managed' | 'external_upload',
    provider: null,
    connectionType: 'scm' as const,
    startedAt: row.startedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    durationSeconds,
  };
}

export const scanService = {
  /**
   * List scans for a workspace with pagination.
   * @param workspaceId - Workspace UUID
   * @param params - Pagination params (page, perPage)
   * @returns Paginated scan list with total count
   * @throws {AppError} If the user is not a workspace member
   */
  async list(workspaceId: string, params: { page: number; perPage: number; search?: string; filters?: { status?: string; stage?: string; origin?: string } }, userId: string) {
    logger.scan.debug('list', { workspaceId, page: params.page });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      const result = await scanRepository.listByWorkspace(workspaceId, params);
      logger.scan.debug('list completed', { result });
      return {
        data: result.data.map(toScanRow),
        total: result.total,
      };
    } catch (error) {
      logger.scan.error('list failed', { error, workspaceId });
      throw error;
    }
  },

  /**
   * Get a scan by ID, verifying workspace membership.
   * @param id - Scan UUID
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID for authorization
   * @returns Scan record
   * @throws {AppError} If scan not found or user is not a workspace member
   */
  async getById(id: string, workspaceId: string, userId: string) {
    logger.scan.debug('getById', { id, workspaceId });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      const scan = await scanRepository.getById(id);
      if (!scan) throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      logger.scan.debug('getById completed', { scan });
      return scan;
    } catch (error) {
      logger.scan.error('getById failed', { error, id });
      throw error;
    }
  },

  /**
   * Get scan detail with findings count, severity breakdown, and AI stats.
   * @param scanId - Scan UUID
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID for authorization
   * @returns ScanDetail object
   * @throws {AppError} If scan not found or user is not a workspace member
   */
  async getDetail(scanId: string, workspaceId: string, userId: string) {
    logger.scan.debug('getDetail', { scanId, workspaceId });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);

      const scan = await scanRepository.getById(scanId);
      if (!scan) throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);

      // Parallelize independent queries
      const [repo, findingsStats, aiStats, aiVerdictStats, scanResults, findingsPerScanner] = await Promise.all([
        scan.repositoryId ? scanRepository.getRepositoryById(scan.repositoryId!) : Promise.resolve(null),
        scanRepository.getFindingsStats(scanId),
        scanRepository.getAiStats(scanId),
        scanRepository.getAiVerdictStats(scanId),
        scanRepository.getScanResults(scanId),
        scanId ? scanRepository.getFindingsPerScanner(scanId) : Promise.resolve([]),
      ]);
      const findingsCountByScanner = new Map(findingsPerScanner.map((r) => [r.scanner, Number(r.count)]));

      // Deduplicate scan results by scanner name (keep latest)
      const scanResultsByScanner = new Map<string, typeof scanResults[number]>();
      for (const sr of scanResults) {
        const existing = scanResultsByScanner.get(sr.scanner);
        if (!existing || (sr.createdAt && existing.createdAt && sr.createdAt > existing.createdAt)) {
          scanResultsByScanner.set(sr.scanner, sr);
        }
      }

      // Build timeline from stored progress events
      const storedEvents: ProgressEvent[] = Array.isArray(scan.progressEvents) ? scan.progressEvents : [];

      // Get duration from progress events (scanner completed events have durationSeconds)
      const scannerDurations = new Map<string, number>();
      for (const event of storedEvents) {
        if (event.type === 'scanning' && event.scanner && event.durationSeconds) {
          scannerDurations.set(event.scanner, event.durationSeconds);
        }
      }

      // Calculate duration
      let durationSeconds: number | undefined;
      if (scan.startedAt && scan.completedAt) {
        durationSeconds = Math.floor((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000);
      }

      const timeline: Array<{ id: string; type: string; description: string; timestamp: string; durationSeconds?: number; metadata?: Record<string, string | number> }> = [];

      // Always add "Scan triggered" as the first event
      timeline.push({
        id: 'triggered',
        type: 'triggered',
        description: 'Scan triggered',
        timestamp: scan.createdAt.toISOString(),
      });

      // Add stored progress events (skip duplicate triggered events)
      for (const event of storedEvents) {
        if (event.type === 'triggered') continue;
        const metadata: Record<string, string | number> = {};
        if (event.scanner) metadata.scanner = event.scanner;
        timeline.push({
          id: event.id,
          type: event.type,
          description: event.description,
          timestamp: event.timestamp,
          durationSeconds: event.durationSeconds,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      }

      // If scan is still running and no completion event, show current status
      if (scan.status === 'processing' || scan.status === 'queued') {
        const lastEvent = storedEvents[storedEvents.length - 1];
        if (!lastEvent || lastEvent.type !== 'completed') {
          timeline.push({
            id: 'in-progress',
            type: scan.status === 'queued' ? 'queued' : 'scanning',
            description: scan.status === 'queued' ? 'Waiting for worker...' : 'Scan in progress...',
            timestamp: new Date().toISOString(),
          });
        }
      }

      const detail = {
        id: scan.id,
        repository: repo?.name ?? 'Unknown',
        branch: scan.branch ?? 'main',
        commitSha: scan.commitSha ?? '—',
        origin: (scan.origin ?? 'managed') as 'managed' | 'external_upload',
        status: scan.status as 'queued' | 'processing' | 'completed' | 'failed',
        startedAt: scan.startedAt?.toISOString() ?? scan.createdAt.toISOString(),
        completedAt: scan.completedAt?.toISOString(),
        durationSeconds,
        // PR metadata
        prNumber: scan.prNumber ?? null,
        baseBranch: scan.baseBranch ?? null,
        headBranch: scan.headBranch ?? null,
        prAuthor: scan.prAuthor ?? null,
        scannerResults: Array.from(scanResultsByScanner.values()).map((sr) => ({
          scanner: sr.scanner,
          status: 'completed' as const,
          findingsCount: findingsCountByScanner.get(sr.scanner) ?? 0,
          durationSeconds: scannerDurations.get(sr.scanner) ?? undefined,
          error: undefined,
        })),
        totalFindings: Number(findingsStats.total) || 0,
        severityBreakdown: {
          critical: Number(findingsStats.critical) || 0,
          high: Number(findingsStats.high) || 0,
          medium: Number(findingsStats.medium) || 0,
          low: Number(findingsStats.low) || 0,
          info: Number(findingsStats.info) || 0,
        },
        aiStats: {
          enabled: true,
          verified: Number(aiVerdictStats.truePositives) || 0,
          total: Number(findingsStats.total) || 0,
          truePositives: Number(aiVerdictStats.truePositives) || 0,
          falsePositives: Number(aiVerdictStats.falsePositives) || 0,
          pending: Number(aiVerdictStats.pending) || 0,
        },
        timeline,
      };

      logger.scan.debug('getDetail completed', { scanId });
      return detail;
    } catch (error) {
      logger.scan.error('getDetail failed', { error, scanId });
      throw error;
    }
  },

  /**
   * Get scan results for a scan, verifying workspace membership.
   * @param scanId - Scan UUID
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID for authorization
   * @returns Array of scan result records
   * @throws {AppError} If scan not found or user is not a workspace member
   */
  async getScanResults(scanId: string, workspaceId: string, userId: string) {
    logger.scan.debug('getScanResults', { scanId });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      const scan = await scanRepository.getById(scanId);
      if (!scan) throw new AppError(SCAN.ERRORS.NOT_FOUND, 404, SCAN.ERRORS.NOT_FOUND_CODE);
      const result = await scanRepository.getScanResults(scanId);
      logger.scan.debug('getScanResults completed', { result });
      return result;
    } catch (error) {
      logger.scan.error('getScanResults failed', { error, scanId });
      throw error;
    }
  },

  /**
   * Create a new scan, verifying workspace membership.
   * @param data - Scan creation data (repositoryId, branch, origin)
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID for authorization
   * @returns Created scan record
   * @throws {AppError} If user is not a workspace member
   */
  async create(data: { repositoryId: string; branch: string; origin: string }, workspaceId: string, userId: string) {
    logger.scan.info('create', { workspaceId, repositoryId: data.repositoryId });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      const result = await scanRepository.create({ ...data, status: 'pending', createdBy: userId });
      logger.scan.info('create completed', { result });
      return result;
    } catch (error) {
      logger.scan.error('create failed', { error, workspaceId });
      throw error;
    }
  },

  /**
   * Update scan status, verifying workspace membership.
   * @param id - Scan UUID
   * @param status - New status value
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID for authorization
   * @returns Updated scan record
   * @throws {AppError} If user is not a workspace member
   */
  async updateStatus(id: string, status: string, workspaceId: string, userId: string) {
    logger.scan.info('updateStatus', { id, status });
    try {
      const role = await workspaceRepository.getMemberRole(workspaceId, userId);
      if (!role) throw new AppError(SCAN.ERRORS.FORBIDDEN, 403, SCAN.ERRORS.FORBIDDEN_CODE);
      const result = await scanRepository.updateStatus(id, status);
      logger.scan.info('updateStatus completed', { result });
      return result;
    } catch (error) {
      logger.scan.error('updateStatus failed', { error, id });
      throw error;
    }
  },
};
