import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateRepositoryInput {
  workspaceId: string;
  projectId: string;
  name: string;
  url: string;
  defaultBranch?: string;
  connectionType?: string;
  autoScan?: boolean;
  createdBy?: string;
}

export interface UpdateRepositoryInput {
  projectId?: string;
  sourceControlId?: string;
  name?: string;
  url?: string;
  defaultBranch?: string;
  connectionType?: string;
  autoScan?: boolean;
  webhookId?: string;
  webhookSecret?: string;
}

export const repositoriesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(repositories)
      .where(and(eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)));
  },

  async getById(id: string, workspaceId: string) {
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.id, id), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    return repo ?? null;
  },

  async create(data: CreateRepositoryInput, tx?: Tx) {
    const executor = tx ?? db;
    const [repo] = await executor
      .insert(repositories)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        name: data.name,
        url: data.url,
        defaultBranch: data.defaultBranch ?? 'main',
        connectionType: data.connectionType ?? 'scm',
        autoScan: data.autoScan ?? false,
        ...(data.createdBy && { createdBy: data.createdBy, updatedBy: data.createdBy }),
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
        updatedAt: new Date(),
      })
      .where(eq(repositories.id, id))
      .returning();
    return repo ?? null;
  },

  async delete(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor
      .update(repositories)
      .set({ deletedAt: new Date() })
      .where(eq(repositories.id, id));
  },

  /**
   * Find a repository by URL within a workspace (for CI/CD auto-registration dedup).
   */
  async findByUrl(url: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [repo] = await executor
      .select()
      .from(repositories)
      .where(and(eq(repositories.url, url), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    return repo ?? null;
  },

  /**
   * Find a repository by name within a workspace (for CI/CD auto-registration).
   */
  async findByNameAndWorkspace(name: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [repo] = await executor
      .select()
      .from(repositories)
      .where(and(eq(repositories.name, name), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    return repo ?? null;
  },
};
