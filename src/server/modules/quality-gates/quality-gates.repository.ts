import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { qualityGates } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface UpsertQualityGateConfigInput {
  threshold: string;
  fail_on_critical: boolean;
  fail_on_high_tp: boolean;
  warn_on_pending: boolean;
  require_human_ack: boolean;
  pending_behavior: string;
}

export const qualityGatesRepository = {
  async getConfig(workspaceId: string) {
    const [config] = await db
      .select()
      .from(qualityGates)
      .where(eq(qualityGates.workspace_id, workspaceId))
      .limit(1);

    return config ?? null;
  },

  async upsertConfig(workspaceId: string, data: UpsertQualityGateConfigInput, tx?: Tx) {
    const executor = tx ?? db;

    const existing = await this.getConfig(workspaceId);

    if (existing) {
      const [updated] = await executor
        .update(qualityGates)
        .set({
          threshold: data.threshold,
          fail_on_critical: data.fail_on_critical,
          fail_on_high_tp: data.fail_on_high_tp,
          warn_on_pending: data.warn_on_pending,
          require_human_ack: data.require_human_ack,
          pending_behavior: data.pending_behavior,
          updated_at: new Date(),
        })
        .where(eq(qualityGates.workspace_id, workspaceId))
        .returning();

      return updated;
    }

    const [created] = await executor
      .insert(qualityGates)
      .values({
        workspace_id: workspaceId,
        threshold: data.threshold,
        fail_on_critical: data.fail_on_critical,
        fail_on_high_tp: data.fail_on_high_tp,
        warn_on_pending: data.warn_on_pending,
        require_human_ack: data.require_human_ack,
        pending_behavior: data.pending_behavior,
      })
      .returning();

    return created;
  },
};
