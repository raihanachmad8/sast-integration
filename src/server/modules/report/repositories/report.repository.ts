import { db } from '@/server/db/client';
import { reports, type NewReport } from '@drizzle/schema/reports';
import { findings, findingGroups, aiVerifications } from '@drizzle/schema/findings';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Report repository providing database operations for report generation and management.
 */
export const reportRepository = {
  /**
   * Create a new report record.
   *
   * @param data - Report metadata
   * @returns Created report record
   */
  async create(data: NewReport) {
    const [inserted] = await db
      .insert(reports)
      .values(data)
      .returning();

    return inserted;
  },

  /**
   * Get a report by ID.
   *
   * @param reportId - Report UUID
   * @returns Report record or null
   */
  async findById(reportId: string) {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    return report ?? null;
  },

  /**
   * List reports for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param limit - Maximum results
   * @returns Array of report records
   */
  async listByWorkspace(workspaceId: string, limit = 25) {
    return db
      .select()
      .from(reports)
      .where(eq(reports.workspace_id, workspaceId))
      .orderBy(desc(reports.created_at))
      .limit(limit);
  },

  /**
   * Update report with file information after generation.
   *
   * @param reportId - Report UUID
   * @param data - Updated fields (file_path, file_size, status)
   */
  async update(reportId: string, data: { file_path?: string; file_size?: number }) {
    await db
      .update(reports)
      .set(data)
      .where(eq(reports.id, reportId));
  },

  /**
   * Get finding statistics for a project.
   *
   * @param projectId - Project UUID
   * @returns Finding counts by severity and status
   */
  async getFindingStats(projectId: string) {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        critical: sql<number>`count(*) filter (where ${findings.severity} = 'critical')::int`,
        high: sql<number>`count(*) filter (where ${findings.severity} = 'high')::int`,
        medium: sql<number>`count(*) filter (where ${findings.severity} = 'medium')::int`,
        low: sql<number>`count(*) filter (where ${findings.severity} = 'low')::int`,
        open: sql<number>`count(*) filter (where ${findings.status} = 'open')::int`,
        fixed: sql<number>`count(*) filter (where ${findings.status} = 'fixed')::int`,
        false_positive: sql<number>`count(*) filter (where ${findings.status} = 'false_positive')::int`,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
      .where(eq(findingGroups.project_id, projectId));

    return stats ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, fixed: 0, false_positive: 0 };
  },

  /**
   * Get AI verification statistics for a project.
   *
   * @param projectId - Project UUID
   * @returns AI verification counts
   */
  async getAiVerificationStats(projectId: string) {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        true_positive: sql<number>`count(*) filter (where ${aiVerifications.verdict} = 'true_positive')::int`,
        false_positive: sql<number>`count(*) filter (where ${aiVerifications.verdict} = 'false_positive')::int`,
      })
      .from(aiVerifications)
      .innerJoin(findings, eq(aiVerifications.finding_id, findings.id))
      .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
      .where(eq(findingGroups.project_id, projectId));

    return stats ?? { total: 0, true_positive: 0, false_positive: 0 };
  },
};
