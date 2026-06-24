import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sourceControls, sourceControlRepositories, sourceControlImports, repositories } from '@drizzle/schema/source-controls';
import type { SourceControl, SourceControlRepository, SourceControlImport, Repository } from '@drizzle/schema/source-controls';
export const sourceControlImportRepository = {
  async findConnectionById(id: string): Promise<SourceControl | null> {
    const [connection] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.id, id))
      .limit(1);
    return connection ?? null;
  },

  async findSourceRepoById(id: string): Promise<SourceControlRepository | null> {
    const [sourceRepo] = await db
      .select()
      .from(sourceControlRepositories)
      .where(and(eq(sourceControlRepositories.id, id), isNull(sourceControlRepositories.deletedAt)))
      .limit(1);
    return sourceRepo ?? null;
  },

  async findActiveImportBySourceRepoId(sourceRepoId: string): Promise<SourceControlImport | null> {
    const [existingImport] = await db
      .select()
      .from(sourceControlImports)
      .where(and(
        eq(sourceControlImports.sourceControlRepositoryId, sourceRepoId),
        isNull(sourceControlImports.uninstalledAt),
      ))
      .limit(1);
    return existingImport ?? null;
  },

  /**
   * Find a repository by name and workspace, including soft-deleted ones.
   * Used to detect stale repos that need to be restored or replaced on re-import.
   */
  async findByNameAndWorkspace(name: string, workspaceId: string): Promise<Repository | null> {
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(
        eq(repositories.name, name),
        eq(repositories.workspaceId, workspaceId),
      ))
      .limit(1);
    return repo ?? null;
  },

  /**
   * Restore a soft-deleted repository by clearing deletedAt/deletedBy.
   */
  async restoreRepository(id: string, userId: string): Promise<void> {
    await db
      .update(repositories)
      .set({ deletedAt: null, deletedBy: null, updatedAt: new Date(), updatedBy: userId })
      .where(eq(repositories.id, id));
  },

  /**
   * Hard-delete a repository record.
   */
  async hardDeleteRepository(id: string): Promise<void> {
    await db.delete(repositories).where(eq(repositories.id, id));
  },

  async createRepository(data: {
    workspaceId: string;
    projectId: string | null;
    name: string;
    url: string;
    defaultBranch: string;
    connectionType: string[];
    importMode: string;
    createdBy: string;
  }): Promise<Repository> {
    const [repo] = await db
      .insert(repositories)
      .values(data)
      .returning();
    return repo;
  },

  async deleteRepositoryById(id: string): Promise<void> {
    await db.delete(repositories).where(eq(repositories.id, id));
  },

  async createImport(data: {
    workspaceId: string;
    sourceControlId: string;
    sourceControlRepositoryId: string;
    repositoryId: string;
    webhookExternalId: string | null;
    webhookSecret: string;
    webhookStatus: string;
    importedBy: string;
    importedAt: Date;
  }): Promise<SourceControlImport> {
    const [importRecord] = await db
      .insert(sourceControlImports)
      .values(data)
      .returning();
    return importRecord;
  },

  async findImportById(id: string): Promise<SourceControlImport | null> {
    const [importRecord] = await db
      .select()
      .from(sourceControlImports)
      .where(eq(sourceControlImports.id, id))
      .limit(1);
    return importRecord ?? null;
  },

  async findRepositoryById(id: string): Promise<Repository | null> {
    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, id))
      .limit(1);
    return repo ?? null;
  },

  async softDeleteRepository(id: string, userId: string): Promise<void> {
    await db
      .update(repositories)
      .set({ deletedAt: new Date(), deletedBy: userId, updatedAt: new Date(), updatedBy: userId })
      .where(eq(repositories.id, id));
  },

  async markImportUninstalled(id: string): Promise<void> {
    await db
      .update(sourceControlImports)
      .set({ uninstalledAt: new Date(), updatedAt: new Date() })
      .where(eq(sourceControlImports.id, id));
  },

  async findActiveImportsByConnectionId(connectionId: string): Promise<SourceControlImport[]> {
    return db
      .select()
      .from(sourceControlImports)
      .where(and(
        eq(sourceControlImports.sourceControlId, connectionId),
        isNull(sourceControlImports.uninstalledAt),
      ));
  },
};
