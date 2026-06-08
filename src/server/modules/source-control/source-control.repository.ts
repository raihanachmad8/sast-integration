import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sourceControls, repositories } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateSourceControlInput {
  workspace_id: string;
  provider: string;
  name: string;
  credentials?: Record<string, unknown>;
  created_by: string;
}

export interface UpdateSourceControlInput {
  provider?: string;
  name?: string;
  credentials?: Record<string, unknown>;
}

export const sourceControlRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspace_id, workspaceId));
  },

  async getById(id: string, workspaceId: string) {
    const [control] = await db
      .select()
      .from(sourceControls)
      .where(and(eq(sourceControls.id, id), eq(sourceControls.workspace_id, workspaceId)))
      .limit(1);
    return control ?? null;
  },

  async create(data: CreateSourceControlInput, tx?: Tx) {
    const executor = tx ?? db;
    const [control] = await executor
      .insert(sourceControls)
      .values({
        workspace_id: data.workspace_id,
        provider: data.provider,
        name: data.name,
        credentials: data.credentials ?? {},
        created_by: data.created_by,
      })
      .returning();
    return control;
  },

  async update(id: string, data: UpdateSourceControlInput, tx?: Tx) {
    const executor = tx ?? db;
    const [control] = await executor
      .update(sourceControls)
      .set(data)
      .where(eq(sourceControls.id, id))
      .returning();
    return control ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(sourceControls).where(eq(sourceControls.id, id));
  },

  async listRepos(providerId: string) {
    return db
      .select()
      .from(repositories)
      .where(and(eq(repositories.source_control_id, providerId), isNull(repositories.deleted_at)));
  },
};
