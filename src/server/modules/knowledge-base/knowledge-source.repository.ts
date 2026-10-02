import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeSources } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateKnowledgeSourceData {
  workspaceId: string;
  name: string;
  type: string;
  url?: string | null;
}

export interface UpdateKnowledgeSourceData {
  name?: string;
  type?: string;
  url?: string | null;
  status?: string;
  entry_count?: number;
  last_synced_at?: Date | null;
}

export const knowledgeSourceRepository = {
  async create(data: CreateKnowledgeSourceData, tx?: Tx) {
    const executor = tx ?? db;

    const [source] = await executor
      .insert(knowledgeSources)
      .values({
        workspace_id: data.workspaceId,
        name: data.name,
        type: data.type,
        url: data.url ?? null,
        status: 'disconnected',
        entry_count: 0,
      })
      .returning();

    return source;
  },

  async findById(id: string, workspaceId: string) {
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.workspace_id, workspaceId)))
      .limit(1);

    return source ?? null;
  },

  async findByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.workspace_id, workspaceId));
  },

  async update(id: string, workspaceId: string, data: UpdateKnowledgeSourceData, tx?: Tx) {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(knowledgeSources)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.entry_count !== undefined && { entry_count: data.entry_count }),
        ...(data.last_synced_at !== undefined && { last_synced_at: data.last_synced_at }),
      })
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.workspace_id, workspaceId)))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(knowledgeSources)
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.workspace_id, workspaceId)));
  },

  async incrementEntryCount(id: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .update(knowledgeSources)
      .set({ entry_count: sql`COALESCE(${knowledgeSources.entry_count}, 0) + 1` })
      .where(eq(knowledgeSources.id, id));
  },

  async decrementEntryCount(id: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .update(knowledgeSources)
      .set({ entry_count: sql`GREATEST(COALESCE(${knowledgeSources.entry_count}, 0) - 1, 0)` })
      .where(eq(knowledgeSources.id, id));
  },
};
