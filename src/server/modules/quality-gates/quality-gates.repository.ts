import { eq } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { qualityGates } from '@drizzle/schema/scans';
import { logger } from '@/server/lib/logger';

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
    logger.scan.debug('getConfig called', { workspaceId });
    const [config] = await db
      .select()
      .from(qualityGates)
      .where(eq(qualityGates.workspaceId, workspaceId))
      .limit(1);

    return config ?? null;
  },

  async upsertConfig(workspaceId: string, data: UpsertQualityGateConfigInput, tx?: Tx) {
    logger.scan.debug('upsertConfig called', { workspaceId });
    try {
      const executor = tx ?? db;
      const [result] = await executor
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
        .onConflictDoUpdate({
          target: qualityGates.workspaceId,
          set: {
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
          },
        })
        .returning();
      return result;
    } catch (error) {
      logger.scan.error('upsertConfig failed', { error });
      throw error;
    }
  },
};
