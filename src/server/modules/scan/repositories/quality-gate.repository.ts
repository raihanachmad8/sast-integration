import { eq, desc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { qualityGates, qualityGateResults } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const qualityGateRepository = {
  /**
   * Find quality gate configuration for a workspace.
   * @param workspaceId - Workspace UUID
   * @param tx - Optional transaction context
   * @returns Quality gate config or null
   */
  async findByWorkspace(workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [gate] = await executor.select().from(qualityGates)
      .where(eq(qualityGates.workspaceId, workspaceId))
      .limit(1);
    return gate ?? null;
  },

  /**
   * Upsert quality gate configuration for a workspace.
   * Creates a new gate if none exists, otherwise updates the existing one.
   * @param workspaceId - Workspace UUID
   * @param data - Gate configuration fields
   * * @param tx - Optional transaction context
   * @returns Upserted quality gate record
   */
  async upsert(workspaceId: string, data: {
    threshold?: string;
    failOnCritical?: boolean;
    failOnHighTp?: boolean;
    warnOnPending?: boolean;
    requireHumanAck?: boolean;
    pendingBehavior?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [result] = await executor.insert(qualityGates)
      .values({ workspaceId, ...data })
      .onConflictDoUpdate({
        target: qualityGates.workspaceId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return result;
  },

  /**
   * Create a quality gate evaluation result.
   * @param data - Result insert data
   * @param tx - Optional transaction context
   * @returns Created result record
   */
  async createResult(data: {
    scanId: string;
    gateId: string;
    status: string;
    blockingFindings?: number;
    pendingFindings?: number;
    newFindings?: number;
    fixedFindings?: number;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [result] = await executor.insert(qualityGateResults).values(data).returning();
    return result;
  },

  /**
   * Get quality gate result for a specific scan.
   * @param scanId - Scan UUID
   * @param tx - Optional transaction context
   * @returns Gate result record or null
   */
  async getResultByScanId(scanId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [result] = await executor.select().from(qualityGateResults)
      .where(eq(qualityGateResults.scanId, scanId))
      .orderBy(desc(qualityGateResults.evaluatedAt))
      .limit(1);
    return result ?? null;
  },

  /**
   * List quality gate results for a workspace.
   * @param workspaceId - Workspace UUID
   * @param tx - Optional transaction context
   * @returns Array of gate result records
   */
  async listResults(workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select({
      id: qualityGateResults.id,
      scanId: qualityGateResults.scanId,
      gateId: qualityGateResults.gateId,
      status: qualityGateResults.status,
      blockingFindings: qualityGateResults.blockingFindings,
      pendingFindings: qualityGateResults.pendingFindings,
      evaluatedAt: qualityGateResults.evaluatedAt,
    }).from(qualityGateResults)
      .innerJoin(qualityGates, eq(qualityGateResults.gateId, qualityGates.id))
      .where(eq(qualityGates.workspaceId, workspaceId))
      .orderBy(desc(qualityGateResults.evaluatedAt));
  },
};
