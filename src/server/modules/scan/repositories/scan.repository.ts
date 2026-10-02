import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans, scanResults, scanUploads, schedules } from '@drizzle/schema/scans';
import type { ScanOrigin } from '../constants';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const scanRepository = {
  /**
   * Create a scan record.
   * origin must be one of SCAN_ORIGINS (centralized to avoid magic strings).
   */
  async create(data: {
    repositoryId: string;
    policyId?: string | null;
    branch: string;
    commitSha?: string | null;
    origin: ScanOrigin;
    triggerSource?: string;
    status?: string;
    createdBy: string;
    metadata?: Record<string, unknown>;
  }, tx?: Tx) {
    const executor = tx ?? db;

    const [scan] = await executor
      .insert(scans)
      .values({
        repository_id: data.repositoryId,
        policy_id: data.policyId,
        branch: data.branch,
        commit_sha: data.commitSha,
        origin: data.origin,
        trigger_source: data.triggerSource,
        status: data.status || 'pending',
        created_by: data.createdBy,
      })
      .returning();

    return scan;
  },

  async createScanResult(data: {
    scanId: string;
    scanner: string;
    format?: string;
    fileKey?: string;
    fileSize?: number;
    parsedSummary?: Record<string, unknown> | null;
  }, tx?: Tx) {
    const executor = tx ?? db;

    const [result] = await executor
      .insert(scanResults)
      .values({
        scan_id: data.scanId,
        scanner: data.scanner,
        format: data.format,
        file_key: data.fileKey,
        file_size: data.fileSize,
        parsed_summary: data.parsedSummary,
      })
      .returning();

    return result;
  },

  async createScanUpload(data: {
    repositoryId: string;
    projectId: string;
    scanId?: string;
    branch?: string;
    commitSha?: string;
    uploadedBy: string;
    source?: string;
    metadata?: Record<string, unknown>;
    projectApiTokenId?: string;
    personalAccessTokenId?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;

    const [upload] = await executor
      .insert(scanUploads)
      .values({
        repository_id: data.repositoryId,
        project_id: data.projectId,
        scan_id: data.scanId,
        branch: data.branch,
        commit_sha: data.commitSha,
        uploaded_by: data.uploadedBy,
        source: data.source,
        metadata: data.metadata,
        projectApiTokenId: data.projectApiTokenId,
        personalAccessTokenId: data.personalAccessTokenId,
      })
      .returning();

    return upload;
  },

  async updateStatus(scanId: string, status: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .update(scans)
      .set({ status })
      .where(eq(scans.id, scanId));
  },

  async updateScanResult(
    scanResultId: string,
    data: { parsedSummary?: Record<string, unknown> | null },
    tx?: Tx
  ) {
    const executor = tx ?? db;
    const { scanResults } = await import('@drizzle/schema/scans');

    await executor
      .update(scanResults)
      .set({ parsed_summary: data.parsedSummary })
      .where(eq(scanResults.id, scanResultId));
  },

  async findById(id: string) {
    const [scan] = await db
      .select()
      .from(scans)
      .where(eq(scans.id, id))
      .limit(1);

    return scan ?? null;
  },

  async listByRepository(repositoryId: string, limit = 25) {
    return db
      .select()
      .from(scans)
      .where(eq(scans.repository_id, repositoryId))
      .orderBy(desc(scans.created_at))
      .limit(limit);
  },

  /** List scan results for a scan (used by manual reparse) */
  async listScanResultsByScanId(scanId: string) {
    const { scanResults } = await import('@drizzle/schema/scans');
    return db
      .select()
      .from(scanResults)
      .where(eq(scanResults.scan_id, scanId));
  },

  async replaceRepositorySchedule(data: {
    repositoryId: string;
    policyId: string;
    branch: string;
    cronExpression: string;
    timezone: string;
    active: boolean;
    createdBy: string;
  }) {
    await db
      .delete(schedules)
      .where(eq(schedules.repository_id, data.repositoryId));

    const [schedule] = await db
      .insert(schedules)
      .values({
        repository_id: data.repositoryId,
        policy_id: data.policyId,
        branch: data.branch,
        timezone: data.timezone,
        cron_expression: data.cronExpression,
        active: data.active,
        created_by: data.createdBy,
      })
      .returning();

    return schedule;
  },

  async disableRepositorySchedule(repositoryId: string) {
    await db
      .update(schedules)
      .set({ active: false })
      .where(and(
        eq(schedules.repository_id, repositoryId),
        eq(schedules.active, true)
      ));
  },
};
