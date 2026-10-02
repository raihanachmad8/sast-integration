import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scanPolicies } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateScanPolicyInput {
  workspaceId: string;
  name: string;
  profile?: string;
  scanners: string[];
  aiVerification?: string;
  severityThreshold?: string;
  timeoutSeconds?: number;
  maxFindings?: number;
}

export interface UpdateScanPolicyInput {
  name?: string;
  profile?: string;
  scanners?: string[];
  aiVerification?: string;
  severityThreshold?: string;
  timeoutSeconds?: number;
  maxFindings?: number;
}

export const scanPolicyRepository = {
  async create(data: CreateScanPolicyInput, tx?: Tx) {
    const executor = tx ?? db;

    const [policy] = await executor
      .insert(scanPolicies)
      .values({
        workspace_id: data.workspaceId,
        name: data.name,
        profile: data.profile || 'standard',
        scanners: data.scanners,
        ai_verification: data.aiVerification || 'enabled',
        severity_threshold: data.severityThreshold || 'medium',
        timeout_seconds: data.timeoutSeconds ?? 300,
        max_findings: data.maxFindings ?? 2000,
      })
      .returning();

    return policy;
  },

  async findById(id: string) {
    const [policy] = await db
      .select()
      .from(scanPolicies)
      .where(eq(scanPolicies.id, id))
      .limit(1);

    return policy ?? null;
  },

  async findByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(scanPolicies)
      .where(eq(scanPolicies.workspace_id, workspaceId));
  },

  async update(id: string, data: UpdateScanPolicyInput, tx?: Tx) {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(scanPolicies)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.profile && { profile: data.profile }),
        ...(data.scanners && { scanners: data.scanners }),
        ...(data.aiVerification && { ai_verification: data.aiVerification }),
        ...(data.severityThreshold && { severity_threshold: data.severityThreshold }),
        ...(data.timeoutSeconds !== undefined && { timeout_seconds: data.timeoutSeconds }),
        ...(data.maxFindings !== undefined && { max_findings: data.maxFindings }),
        updated_at: new Date(),
      })
      .where(eq(scanPolicies.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(scanPolicies)
      .where(eq(scanPolicies.id, id));
  },

  async countAttachedRepositories(id: string) {
    const rows = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(and(
        eq(repositories.current_policy_id, id),
        isNull(repositories.deleted_at)
      ));

    return rows.length;
  },
};
