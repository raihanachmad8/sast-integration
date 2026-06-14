import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { workspaceSettings } from '@drizzle/schema/workspaces';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const workspaceSettingsRepository = {
  /**
   * Get a setting by key for a workspace.
   */
  async getByKey(workspaceId: string, key: string): Promise<string | null> {
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
    return db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, workspaceId));
  },

  /**
   * Set a setting value (upsert).
   */
  async set(workspaceId: string, key: string, value: string, tx?: Tx) {
    const executor = tx ?? db;
    
    // Try to update first
    const [updated] = await executor
      .update(workspaceSettings)
      .set({ value, updatedAt: new Date() })
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)))
      .returning();

    if (updated) return updated;

    // If not found, insert
    const [created] = await executor
      .insert(workspaceSettings)
      .values({ workspaceId, key, value })
      .returning();

    return created;
  },

  /**
   * Delete a setting by key.
   */
  async delete(workspaceId: string, key: string) {
    await db
      .delete(workspaceSettings)
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)));
  },
};
