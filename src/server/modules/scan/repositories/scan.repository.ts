import { eq, desc, count, sql, and, or, ilike, isNull, inArray } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { getOffset } from '@/lib/pagination';
import { scans, scanResults, scanUploads } from '@drizzle/schema/scans';
import type { ProgressEvent } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';
import { findings, findingGroups, aiVerifications, findingGroupScans } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ScanListFilters {
  status?: string;
  stage?: string;
  origin?: string;
}

export const scanRepository = {
  /**
   * Find a scan by repository ID and commit SHA.
   * Used by CI/CD uploads to find existing scans for the same commit.
   * @param repositoryId - Repository UUID
   * @param commitSha - Commit SHA to search for
   * @param tx - Optional transaction context
   * @returns Scan record or null
   */
  async findByCommitSha(repositoryId: string, commitSha: string, tx?: Tx) {
    const executor = tx ?? db;
    const [scan] = await executor
      .select()
      .from(scans)
      .where(and(eq(scans.repositoryId, repositoryId), eq(scans.commitSha, commitSha)))
      .limit(1);
    return scan ?? null;
  },

  /**
   * List scans for a workspace with pagination.
   * Includes findings count, critical count, and AI verification stats.
   * @param workspaceId - Workspace UUID
   * @param params - Pagination params (page, perPage) and optional filters
   * @param tx - Optional transaction context
   * @returns Paginated scan list with total count
   */
  async listByWorkspace(workspaceId: string, params: { page: number; perPage: number; search?: string; filters?: ScanListFilters; accessibleProjectIds?: string[] }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);
    const filters = params.filters ?? {};

    // Build where conditions
    const conditions = [eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)];
    if (filters.status) conditions.push(eq(scans.status, filters.status));
    if (filters.origin) conditions.push(eq(scans.origin, filters.origin));
    if (params.search) conditions.push(ilike(repositories.name, `%${params.search}%`));
    if (filters.stage) {
      const VALID_STAGES = ['triggered', 'queued', 'cloning', 'scanning', 'parsing', 'ai_verifying', 'completed', 'failed', 'skipped'];
      if (VALID_STAGES.includes(filters.stage)) {
        const stagePattern = `%"type":"${filters.stage}"%`;
        conditions.push(sql`${scans.progressEvents}::text like ${stagePattern}`);
      }
    }

    // Project-scoped filter: repos with null projectId visible to all, others only if in accessibleProjectIds
    if (params.accessibleProjectIds) {
      conditions.push(
        or(
          isNull(repositories.projectId),
          inArray(repositories.projectId, params.accessibleProjectIds),
        )!,
      );
    }

    // Main query: get scans with repository info
    const data = await executor.select({
      id: scans.id,
      repositoryId: scans.repositoryId,
      repositoryName: repositories.name,
      status: scans.status,
      branch: scans.branch,
      origin: scans.origin,
      commitSha: scans.commitSha,
      startedAt: scans.startedAt,
      completedAt: scans.completedAt,
      createdAt: scans.createdAt,
      connectionType: repositories.connectionType,
    })
      .from(scans)
      .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(and(...conditions))
      .orderBy(desc(scans.createdAt))
      .limit(params.perPage).offset(offset);

    // Get findings count for each scan (open groups only)
    const scanIds = data.map((s) => s.id);
    const findingsCounts = scanIds.length > 0
      ? await executor.select({
          scanId: findings.scanId,
          total: count(),
          critical: sql<number>`count(*) filter (where ${findings.severity} = 'critical')`.as('critical'),
        })
          .from(findings)
          .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
          .where(and(sql`${findings.scanId} in ${scanIds}`, eq(findingGroups.status, 'open')))
          .groupBy(findings.scanId)
      : [];

    // Get AI verification counts for each scan
    const aiCounts = scanIds.length > 0
      ? await executor.select({
          scanId: findings.scanId,
          verified: count(),
        })
          .from(aiVerifications)
          .innerJoin(findings, eq(aiVerifications.findingId, findings.id))
          .where(sql`${findings.scanId} in ${scanIds} and ${aiVerifications.verdict} = 'true_positive'`)
          .groupBy(findings.scanId)
      : [];

    // Merge counts into data
    const findingsMap = new Map(findingsCounts.map((fc) => [fc.scanId, { total: Number(fc.total), critical: Number(fc.critical) }]));
    const aiMap = new Map(aiCounts.map((ac) => [ac.scanId, Number(ac.verified)]));

    const enrichedData = data.map((row) => ({
      ...row,
      findingsCount: findingsMap.get(row.id)?.total ?? 0,
      criticalCount: findingsMap.get(row.id)?.critical ?? 0,
      aiVerifiedCount: aiMap.get(row.id) ?? 0,
    }));

    // Get total count
    const [{ total }] = await executor.select({ total: count() }).from(scans)
      .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(and(...conditions));

    return { data: enrichedData, total };
  },

  /**
   * List scans by repository ID.
   * @param repositoryId - Repository UUID
   * @param params - Pagination params
   * @param tx - Optional transaction context
   * @returns Paginated scan list with total count
   */
  async listByRepository(repositoryId: string, params: { page: number; perPage: number }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);
    const data = await executor.select({
      id: scans.id,
      repositoryId: scans.repositoryId,
      status: scans.status,
      branch: scans.branch,
      origin: scans.origin,
      triggerSource: scans.triggerSource,
      startedAt: scans.startedAt,
      completedAt: scans.completedAt,
      createdAt: scans.createdAt,
    }).from(scans)
      .where(eq(scans.repositoryId, repositoryId))
      .orderBy(desc(scans.createdAt))
      .limit(params.perPage).offset(offset);

    const [{ total }] = await executor.select({ total: count() }).from(scans)
      .where(eq(scans.repositoryId, repositoryId));

    return { data, total };
  },

  /**
   * Get a scan by ID.
   * @param id - Scan UUID
   * @param tx - Optional transaction context
   * @returns Scan record or null
   */
  async getById(id: string, tx?: Tx) {
    const executor = tx ?? db;
    const [scan] = await executor.select().from(scans).where(eq(scans.id, id)).limit(1);
    return scan ?? null;
  },

  /**
   * Get scan results for a scan.
   * @param scanId - Scan UUID
   * @param tx - Optional transaction context
   * @returns Array of scan result records
   */
  async getScanResults(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(scanResults).where(eq(scanResults.scanId, scanId));
  },

  /**
   * List scan results by scan ID (alias for getScanResults).
   * @param scanId - Scan UUID
   * @param tx - Optional transaction context
   * @returns Array of scan result records
   */
  async listScanResultsByScanId(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(scanResults).where(eq(scanResults.scanId, scanId));
  },

  /**
   * Atomically mark a scan as completed — only if currently in 'parsing' or 'processing' status.
   * Returns the updated scan if this call won the race, null otherwise.
   *
   * @remarks
   * Uses a single UPDATE ... WHERE ... RETURNING to ensure only one caller wins.
   * This prevents the race condition where two parse jobs both check-then-update.
   */
  async tryCompleteScan(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    logger.scan.info('tryCompleteScan: attempting atomic complete', { scanId });

    const [scan] = await executor.update(scans)
      .set({ status: 'completed', completedAt: new Date() })
      .where(and(eq(scans.id, scanId), sql`${scans.status} IN ('parsing', 'processing')`))
      .returning();

    if (scan) {
      logger.scan.info('tryCompleteScan: scan marked completed', { scanId, previousStatus: scan.status });
    } else {
      // Check current status to understand why it didn't complete
      const [current] = await executor.select({ status: scans.status }).from(scans).where(eq(scans.id, scanId)).limit(1);
      logger.scan.warn('tryCompleteScan: scan not updated (wrong status or already completed)', {
        scanId,
        currentStatus: current?.status ?? 'not_found',
      });
    }

    return scan ?? null;
  },

  /**
   * Create a new scan record.
   * @param data - Scan creation data
   * @param tx - Optional transaction context
   * @returns Created scan record
   */
  async create(data: {
    repositoryId: string;
    branch: string;
    origin: string;
    status: string;
    createdBy?: string;
    commitSha?: string;
    triggerSource?: string;
    // PR metadata
    prNumber?: number | null;
    baseBranch?: string | null;
    headBranch?: string | null;
    prAuthor?: string | null;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [scan] = await executor.insert(scans).values(data).returning();
    return scan;
  },

  /**
   * Create a scan result record.
   * @param data - Scan result creation data
   * @param tx - Optional transaction context
   * @returns Created scan result record
   */
  async createScanResult(data: { scanId: string; scanner: string; format?: string; fileKey?: string; fileSize?: number; parsedSummary?: unknown }, tx?: Tx) {
    const executor = tx ?? db;
    const [result] = await executor.insert(scanResults).values(data).returning();
    return result;
  },

  /**
   * Create a scan upload record.
   * @param data - Scan upload creation data
   * @param tx - Optional transaction context
   * @returns Created scan upload record
   */
  async createScanUpload(data: { repositoryId?: string; projectId?: string; scanId?: string; branch?: string; commitSha?: string; uploadedBy?: string; source?: string; metadata?: unknown; projectApiTokenId?: string; personalAccessTokenId?: string }, tx?: Tx) {
    const executor = tx ?? db;
    const [upload] = await executor.insert(scanUploads).values(data).returning();
    return upload;
  },

  /**
   * Update scan status and timestamps.
   * @param id - Scan UUID
   * @param status - New status value
   * @param tx - Optional transaction context
   * @returns Updated scan record
   */
  async updateStatus(id: string, status: string, tx?: Tx) {
    const executor = tx ?? db;
    const updates: Record<string, unknown> = { status };
    if (status === 'running') updates.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updates.completedAt = new Date();
    const [scan] = await executor.update(scans).set(updates)
      .where(and(eq(scans.id, id), or(
        eq(scans.status, 'queued'),
        eq(scans.status, 'processing'),
        eq(scans.status, 'running'),
        eq(scans.status, 'parsing'),
      )))
      .returning();
    return scan;
  },

  /**
   * Append a progress event to the scan's progressEvents JSONB array.
   * Uses PostgreSQL JSONB || operator to concatenate arrays.
   * @param id - Scan UUID
   * @param event - Progress event to append
   * @param tx - Optional transaction context
   */
  async appendProgressEvent(id: string, event: ProgressEvent, tx?: Tx) {
    const executor = tx ?? db;
    await executor.update(scans).set({
      progressEvents: sql`${scans.progressEvents} || ${JSON.stringify([event])}::jsonb`,
    }).where(eq(scans.id, id));
  },

  /**
   * Find a repository by ID. Excludes soft-deleted repositories.
   * @param repositoryId - Repository UUID
   * @param tx - Optional transaction context
   * @returns Repository record or null
   */
  async getRepositoryById(repositoryId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.query.repositories.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, repositoryId), isNull(r.deletedAt)),
    });
  },

  /**
   * Get findings count and severity breakdown for a scan.
   * @param scanId - Scan UUID
   * @param tx - Optional transaction context
   * @returns Totals and per-severity counts
   */
  async getFindingsStats(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [stats] = await executor.select({
      total: count(),
      critical: sql<number>`count(*) filter (where ${findings.severity} = 'critical')`.as('critical'),
      high: sql<number>`count(*) filter (where ${findings.severity} = 'high')`.as('high'),
      medium: sql<number>`count(*) filter (where ${findings.severity} = 'medium')`.as('medium'),
      low: sql<number>`count(*) filter (where ${findings.severity} = 'low')`.as('low'),
      info: sql<number>`count(*) filter (where ${findings.severity} = 'info')`.as('info'),
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findings.scanId, scanId), eq(findingGroups.status, 'open')));
    return stats;
  },

  /**
   * Get new vs pre-existing finding counts for a scan.
   * Uses the explicit finding_group_scans junction table for accurate tracking.
   * Falls back to timestamp comparison if no junction data exists (legacy scans).
   */
  async getNewVsExistingStats(scanId: string, tx?: Tx) {
    const executor = tx ?? db;

    // Try junction table first (accurate)
    const [junctionStats] = await executor.select({
      newCount: sql<number>`count(*) filter (where ${findingGroupScans.isNew})`.as('newCount'),
      existingCount: sql<number>`count(*) filter (where not ${findingGroupScans.isNew})`.as('existingCount'),
    }).from(findingGroupScans)
      .where(eq(findingGroupScans.scanId, scanId));

    if (junctionStats && (junctionStats.newCount + junctionStats.existingCount) > 0) {
      return junctionStats;
    }

    // Fallback: timestamp comparison for legacy scans without junction data
    const [fallbackStats] = await executor.select({
      newCount: sql<number>`count(*) filter (where ${findingGroups.firstSeenAt} >= ${scans.startedAt})`.as('newCount'),
      existingCount: sql<number>`count(*) filter (where ${findingGroups.firstSeenAt} < ${scans.startedAt})`.as('existingCount'),
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(eq(findings.scanId, scanId), eq(findingGroups.status, 'open')));

    return fallbackStats;
  },

  /**
   * Get total AI verification count for a scan.
   */
  async getAiStats(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [stats] = await executor.select({
      total: count(),
    }).from(aiVerifications)
      .innerJoin(findings, eq(aiVerifications.findingId, findings.id))
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findings.scanId, scanId), eq(findingGroups.status, 'open')));
    return stats;
  },

  /**
   * Get AI verdict breakdown (true positives, false positives, pending) for a scan.
   */
  async getAiVerdictStats(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [stats] = await executor.select({
      truePositives: sql<number>`count(*) filter (where ${aiVerifications.verdict} = 'true_positive')`.as('tp'),
      falsePositives: sql<number>`count(*) filter (where ${aiVerifications.verdict} = 'false_positive')`.as('fp'),
      pending: sql<number>`count(*) filter (where ${aiVerifications.verdict} = 'pending')`.as('pending'),
    }).from(aiVerifications)
      .innerJoin(findings, eq(aiVerifications.findingId, findings.id))
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findings.scanId, scanId), eq(findingGroups.status, 'open')));
    return stats;
  },

  /**
   * Get findings count grouped by scanner for a scan.
   * @param scanId - Scan UUID
   * @param tx - Optional transaction context
   * @returns Array of { scanner, count } objects
   */
  async getFindingsPerScanner(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select({
      scanner: findings.scanner,
      count: count(),
    })
      .from(findings)
      .where(eq(findings.scanId, scanId))
      .groupBy(findings.scanner);
  },

  /**
   * Find scans older than cutoff date with their file keys for cleanup.
   */
  async findOldScansWithFiles(cutoffDate: Date, limit: number = 100, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select({
      scanId: scans.id,
      fileKey: scanResults.fileKey,
    })
      .from(scans)
      .innerJoin(scanResults, eq(scans.id, scanResults.scanId))
      .where(and(
        sql`${scans.createdAt} < ${cutoffDate}`,
        sql`${scanResults.fileKey} IS NOT NULL`,
      ))
      .limit(limit);
  },

  /**
   * Delete scan and its related records.
   */
  async deleteScanWithRelations(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(aiVerifications).where(eq(aiVerifications.findingId, sql`(SELECT id FROM ${findings} WHERE scanId = ${scanId})`));
    await executor.delete(findings).where(eq(findings.scanId, scanId));
    await executor.delete(scanResults).where(eq(scanResults.scanId, scanId));
    await executor.delete(scanUploads).where(eq(scanUploads.scanId, scanId));
    await executor.delete(scans).where(eq(scans.id, scanId));
  },
};
