import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sourceControls, sourceControlRepositories, sourceControlImports, repositories } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateSourceControlInput {
  workspaceId: string;
  provider: string;
  name: string;
  credentials?: Record<string, unknown>;
  createdBy: string;
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
      .where(eq(sourceControls.workspaceId, workspaceId));
  },

  async getById(id: string, workspaceId: string) {
    const [control] = await db
      .select()
      .from(sourceControls)
      .where(and(eq(sourceControls.id, id), eq(sourceControls.workspaceId, workspaceId)))
      .limit(1);
    return control ?? null;
  },

  /**
   * Get source control by ID without workspace scoping (for internal use).
   */
  async getByIdRaw(id: string) {
    const [control] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.id, id))
      .limit(1);
    return control ?? null;
  },

  async create(data: CreateSourceControlInput, tx?: Tx) {
    const executor = tx ?? db;
    const [control] = await executor
      .insert(sourceControls)
      .values({
        workspaceId: data.workspaceId,
        provider: data.provider,
        name: data.name,
        credentials: data.credentials ?? {},
        createdBy: data.createdBy,
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

  /**
   * Find the source control import for a repository.
   * Returns the sourceControlRepository record (with name/full_name) if found.
   */
  async findImportByRepositoryId(repositoryId: string, workspaceId: string) {
    const [result] = await db
      .select({
        sourceControlId: sourceControlImports.sourceControlId,
        sourceControlRepositoryId: sourceControlImports.sourceControlRepositoryId,
        name: sourceControlRepositories.name,
        fullName: sourceControlRepositories.fullName,
      })
      .from(sourceControlImports)
      .innerJoin(sourceControlRepositories, eq(sourceControlImports.sourceControlRepositoryId, sourceControlRepositories.id))
      .where(and(
        eq(sourceControlImports.repositoryId, repositoryId),
        eq(sourceControlImports.workspaceId, workspaceId),
        isNull(sourceControlRepositories.deletedAt),
      ))
      .limit(1);

    return result ?? null;
  },
};
