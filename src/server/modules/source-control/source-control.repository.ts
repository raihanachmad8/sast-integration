import { eq, and, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { sourceControls, sourceControlRepositories, sourceControlImports } from '@drizzle/schema/source-controls';
import { logger } from '@/server/lib/logger';
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
  lastSyncedAt?: Date | null;
}

export const sourceControlRepository = {
  /**
   * List all source control integrations in a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Array of source control records
   */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspaceId, workspaceId));
  },

  /**
   * List all source control integrations.
   * @returns Array of all source control records
   */
  async listAll() {
    return db.select().from(sourceControls).limit(500);
  },

  /**
   * Get a source control integration by ID scoped to a workspace.
   * @param id - Source control UUID
   * @param workspaceId - Workspace UUID for scoping
   * @returns Source control record or null if not found
   */
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

  /**
   * Create a new source control integration record.
   * @param data - Source control input data (workspaceId, provider, name, optional credentials, createdBy)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created source control record
   */
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

  /**
   * Update a source control integration record.
   * @param id - Source control UUID
   * @param data - Fields to update
   * @param tx - Optional transaction context
   * @returns Updated source control record or null if not found
   */
  async update(id: string, data: UpdateSourceControlInput, tx?: Tx) {
    const executor = tx ?? db;
    const [control] = await executor
      .update(sourceControls)
      .set(data)
      .where(eq(sourceControls.id, id))
      .returning();
    return control ?? null;
  },

  /**
   * Delete a source control integration record.
   * @param id - Source control UUID
   * @param tx - Optional transaction context
   */
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
