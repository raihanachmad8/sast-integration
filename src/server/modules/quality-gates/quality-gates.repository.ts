import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { qualityGates } from '@drizzle/schema/scans';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface UpsertQualityGateConfigInput {
  threshold: string;
  failOnCritical: boolean;
  failOnHighTp: boolean;
  failOnHigh: boolean;
  failOnMedium: boolean;
  failOnLow: boolean;
  failOnPending: boolean;
  failOnTp: boolean;
  warnOnPending: boolean;
  requireHumanAck: boolean;
  pendingBehavior: string;
}

export const qualityGatesRepository = {
  async getConfig(workspaceId: string) {
    const [config] = await db
      .select()
      .from(qualityGates)
      .where(eq(qualityGates.workspaceId, workspaceId))
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
          failOnCritical: data.failOnCritical,
          failOnHighTp: data.failOnHighTp,
          failOnHigh: data.failOnHigh,
          failOnMedium: data.failOnMedium,
          failOnLow: data.failOnLow,
          failOnPending: data.failOnPending,
          failOnTp: data.failOnTp,
          warnOnPending: data.warnOnPending,
          requireHumanAck: data.requireHumanAck,
          pendingBehavior: data.pendingBehavior,
          updatedAt: new Date(),
        })
        .where(eq(qualityGates.workspaceId, workspaceId))
        .returning();

      return updated;
    }

    const [created] = await executor
      .insert(qualityGates)
      .values({
        workspaceId,
        threshold: data.threshold,
        failOnCritical: data.failOnCritical,
        failOnHighTp: data.failOnHighTp,
        failOnHigh: data.failOnHigh,
        failOnMedium: data.failOnMedium,
        failOnLow: data.failOnLow,
        failOnPending: data.failOnPending,
        failOnTp: data.failOnTp,
        warnOnPending: data.warnOnPending,
        requireHumanAck: data.requireHumanAck,
        pendingBehavior: data.pendingBehavior,
      })
      .returning();

    return created;
  },
};
