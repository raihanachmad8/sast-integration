import { eq, and } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { workspaceSettings } from '@drizzle/schema/workspaces';
import { logger } from '@/server/lib/logger';

export const workspaceSettingsRepository = {
  /**
   * Get a setting by key for a workspace.
   */
  async getByKey(workspaceId: string, key: string): Promise<string | null> {
    logger.workspace.debug('getByKey called', { workspaceId, key });
    const [setting] = await db
      .select()
      .from(workspaceSettings)
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)))
      .limit(1);
    return setting?.value ?? null;
  },

  /**
   * Get all settings for a workspace.
   */
  async getAllByWorkspace(workspaceId: string) {
    logger.workspace.debug('getAllByWorkspace called', { workspaceId });
    return db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId));
  },

  /**
   * Set a setting value (upsert).
   */
  async set(workspaceId: string, key: string, value: string, tx?: Tx) {
    logger.workspace.debug('set called', { workspaceId, key });
    try {
      const executor = tx ?? db;
      const [result] = await executor
        .insert(workspaceSettings)
        .values({ workspaceId, key, value })
        .onConflictDoUpdate({
          target: [workspaceSettings.workspaceId, workspaceSettings.key],
          set: { value, updatedAt: new Date() },
        })
        .returning();
      return result;
    } catch (error) {
      logger.workspace.error('set failed', { error });
      throw error;
    }
  },

  /**
   * Delete a setting by key.
   */
  async delete(workspaceId: string, key: string) {
    logger.workspace.debug('delete called', { workspaceId, key });
    try {
      await db
        .delete(workspaceSettings)
        .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)));
    } catch (error) {
      logger.workspace.error('delete failed', { error });
      throw error;
    }
  },
};
