import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateRepositoryInput {
  workspace_id: string;
  project_id: string;
  source_control_id?: string;
  name: string;
  url: string;
  default_branch?: string;
  connection_type?: string;
  auto_scan?: boolean;
  created_by: string;
}

export interface UpdateRepositoryInput {
  project_id?: string;
  source_control_id?: string;
  name?: string;
  url?: string;
  default_branch?: string;
  connection_type?: string;
  auto_scan?: boolean;
  webhook_id?: string;
  webhook_secret?: string;
}

export const repositoriesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(repositories)
      .where(and(eq(repositories.workspace_id, workspaceId), isNull(repositories.deleted_at)));
  },

  async getById(id: string, workspaceId: string) {
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.id, id), eq(repositories.workspace_id, workspaceId), isNull(repositories.deleted_at)))
      .limit(1);
    return repo ?? null;
  },

  async create(data: CreateRepositoryInput, tx?: Tx) {
    const executor = tx ?? db;
    const [repo] = await executor
      .insert(repositories)
      .values({
        workspace_id: data.workspace_id,
        project_id: data.project_id,
        source_control_id: data.source_control_id,
        name: data.name,
        url: data.url,
        default_branch: data.default_branch ?? 'main',
        connection_type: data.connection_type ?? 'scm',
        auto_scan: data.auto_scan ?? false,
        created_by: data.created_by,
        updated_by: data.created_by,
      })
      .returning();
    return repo;
  },

  async update(id: string, data: UpdateRepositoryInput, tx?: Tx) {
    const executor = tx ?? db;
    const [repo] = await executor
      .update(repositories)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(repositories.id, id))
      .returning();
    return repo ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor
      .update(repositories)
      .set({ deleted_at: new Date() })
      .where(eq(repositories.id, id));
  },
};
