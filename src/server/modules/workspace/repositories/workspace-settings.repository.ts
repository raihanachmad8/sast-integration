import { eq, and } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { workspaceSettings, type WorkspaceSetting } from '@drizzle/schema/workspaces';

export interface IWorkspaceSettingsRepository {
  getByKey(workspaceId: string, key: string): Promise<string | null>;
  getAllByWorkspace(workspaceId: string): Promise<WorkspaceSetting[]>;
  set(workspaceId: string, key: string, value: string, tx?: Tx): Promise<WorkspaceSetting>;
  delete(workspaceId: string, key: string): Promise<void>;
}

export const workspaceSettingsRepository: IWorkspaceSettingsRepository = {
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
  },

  /**
   * Delete a setting by key.
   */
  async delete(workspaceId: string, key: string) {
    logger.workspace.debug('delete called', { workspaceId, key });
    await db
      .delete(workspaceSettings)
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)));
  },
};
