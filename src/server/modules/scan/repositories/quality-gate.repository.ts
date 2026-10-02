import { db } from '@/server/db/client';
import { qualityGates, qualityGateResults, type NewQualityGate } from '@drizzle/schema/scans';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Quality gate repository providing database operations for quality gate configuration and evaluation.
 *
 * Quality gates define pass/fail rules for scan results based on:
 * - Severity thresholds (critical, high, medium, low)
 * - AI verification status (pending, verified)
 * - Human acknowledgement requirements
 */
export const qualityGateRepository = {
  /**
   * Get quality gate configuration for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @returns Quality gate config or null
   */
  async findByWorkspace(workspaceId: string) {
    const [gate] = await db
      .select()
      .from(qualityGates)
      .where(eq(qualityGates.workspace_id, workspaceId))
      .limit(1);

    return gate ?? null;
  },

  /**
   * Create or update quality gate configuration for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param data - Quality gate settings
   * @returns Created/updated quality gate config
   */
  async upsert(workspaceId: string, data: Partial<NewQualityGate>) {
    const existing = await this.findByWorkspace(workspaceId);

    if (existing) {
      const [updated] = await db
        .update(qualityGates)
        .set({ ...data, updated_at: new Date() })
        .where(eq(qualityGates.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(qualityGates)
      .values({ workspace_id: workspaceId, ...data } as NewQualityGate)
      .returning();

    return created;
  },

  /**
   * Save quality gate evaluation result for a scan.
   *
   * @param data - Evaluation result
   * @returns Saved result record
   */
  async saveResult(data: {
    scanId: string;
    gateId: string;
    status: 'passed' | 'failed' | 'warning';
    blockingFindings: number;
    pendingFindings: number;
  }) {
    const [result] = await db
      .insert(qualityGateResults)
      .values({
        scan_id: data.scanId,
        gate_id: data.gateId,
        status: data.status,
        blocking_findings: data.blockingFindings,
        pending_findings: data.pendingFindings,
      })
      .returning();

    return result;
  },

  /**
   * Get quality gate result for a scan.
   *
   * @param scanId - Scan UUID
   * @returns Evaluation result or null
   */
  async getResultByScanId(scanId: string) {
    const [result] = await db
      .select()
      .from(qualityGateResults)
      .where(eq(qualityGateResults.scan_id, scanId))
      .limit(1);

    return result ?? null;
  },

  /**
   * List recent quality gate evaluation results for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param limit - Max results to return (default 20)
   * @returns Array of evaluation results with scan info
   */
  async listResultsByWorkspace(workspaceId: string, limit = 20) {
    const gate = await this.findByWorkspace(workspaceId);
    if (!gate) return [];

    const results = await db
      .select({
        id: qualityGateResults.id,
        scan_id: qualityGateResults.scan_id,
        status: qualityGateResults.status,
        blocking_findings: qualityGateResults.blocking_findings,
        pending_findings: qualityGateResults.pending_findings,
        evaluated_at: qualityGateResults.evaluated_at,
      })
      .from(qualityGateResults)
      .where(eq(qualityGateResults.gate_id, gate.id))
      .orderBy(desc(qualityGateResults.evaluated_at))
      .limit(limit);

    return results;
  },
};
