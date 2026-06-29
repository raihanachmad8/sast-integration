import { eq, and, isNull } from 'drizzle-orm';

import { db } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { sourceControls, sourceControlRepositories, sourceControlImports, repositories } from '@drizzle/schema/source-controls';
import type { SourceControl, SourceControlRepository, SourceControlImport, Repository } from '@drizzle/schema/source-controls';
export const sourceControlImportRepository = {
  async findConnectionById(id: string): Promise<SourceControl | null> {
    logger.sourceControl.info('findConnectionById', { id });
    const [connection] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.id, id))
      .limit(1);
    if (!connection) {
      logger.sourceControl.warn('findConnectionById: connection not found', { id });
    }
    return connection ?? null;
  },

  async findSourceRepoById(id: string): Promise<SourceControlRepository | null> {
    logger.sourceControl.info('findSourceRepoById', { id });
    const [sourceRepo] = await db
      .select()
      .from(sourceControlRepositories)
      .where(and(eq(sourceControlRepositories.id, id), isNull(sourceControlRepositories.deletedAt)))
      .limit(1);
    if (!sourceRepo) {
      logger.sourceControl.warn('findSourceRepoById: source repo not found', { id });
    }
    return sourceRepo ?? null;
  },

  async findActiveImportBySourceRepoId(sourceRepoId: string): Promise<SourceControlImport | null> {
    logger.sourceControl.info('findActiveImportBySourceRepoId', { sourceRepoId });
    const [existingImport] = await db
      .select()
      .from(sourceControlImports)
      .where(and(
        eq(sourceControlImports.sourceControlRepositoryId, sourceRepoId),
        isNull(sourceControlImports.uninstalledAt),
      ))
      .limit(1);
    if (!existingImport) {
      logger.sourceControl.warn('findActiveImportBySourceRepoId: no active import found', { sourceRepoId });
    }
    return existingImport ?? null;
  },

  /**
   * Find a repository by name and workspace, including soft-deleted ones.
   * Used to detect stale repos that need to be restored or replaced on re-import.
   */
  async findByNameAndWorkspace(name: string, workspaceId: string): Promise<Repository | null> {
    logger.sourceControl.info('findByNameAndWorkspace', { name, workspaceId });
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(
        eq(repositories.name, name),
        eq(repositories.workspaceId, workspaceId),
      ))
      .limit(1);
    if (!repo) {
      logger.sourceControl.warn('findByNameAndWorkspace: repository not found', { name, workspaceId });
    }
    return repo ?? null;
  },

  /**
   * Restore a soft-deleted repository by clearing deletedAt/deletedBy.
   */
  async restoreRepository(id: string, userId: string): Promise<void> {
    logger.sourceControl.info('restoreRepository', { id, userId });
    await db
      .update(repositories)
      .set({ deletedAt: null, deletedBy: null, updatedAt: new Date(), updatedBy: userId })
      .where(eq(repositories.id, id));
    logger.sourceControl.info('restoreRepository completed', { id });
  },

  /**
   * Hard-delete a repository record.
   */
  async hardDeleteRepository(id: string): Promise<void> {
    logger.sourceControl.info('hardDeleteRepository', { id });
    await db.delete(repositories).where(eq(repositories.id, id));
    logger.sourceControl.info('hardDeleteRepository completed', { id });
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
    logger.sourceControl.info('createRepository', { name: data.name, workspaceId: data.workspaceId });
    try {
      const [repo] = await db
        .insert(repositories)
        .values(data)
        .returning();
      logger.sourceControl.info('createRepository completed', { repoId: repo.id, name: data.name });
      return repo;
    } catch (error) {
      logger.sourceControl.error('createRepository failed', { name: data.name, workspaceId: data.workspaceId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  async deleteRepositoryById(id: string): Promise<void> {
    logger.sourceControl.info('deleteRepositoryById', { id });
    await db.delete(repositories).where(eq(repositories.id, id));
    logger.sourceControl.info('deleteRepositoryById completed', { id });
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
    logger.sourceControl.info('createImport', { workspaceId: data.workspaceId, sourceControlId: data.sourceControlId, repositoryId: data.repositoryId });
    try {
      const [importRecord] = await db
        .insert(sourceControlImports)
        .values(data)
        .returning();
      logger.sourceControl.info('createImport completed', { importId: importRecord.id });
      return importRecord;
    } catch (error) {
      logger.sourceControl.error('createImport failed', { workspaceId: data.workspaceId, repositoryId: data.repositoryId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  async findImportById(id: string): Promise<SourceControlImport | null> {
    logger.sourceControl.info('findImportById', { id });
    const [importRecord] = await db
      .select()
      .from(sourceControlImports)
      .where(eq(sourceControlImports.id, id))
      .limit(1);
    if (!importRecord) {
      logger.sourceControl.warn('findImportById: import not found', { id });
    }
    return importRecord ?? null;
  },

  async findRepositoryById(id: string): Promise<Repository | null> {
    logger.sourceControl.info('findRepositoryById', { id });
    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, id))
      .limit(1);
    if (!repo) {
      logger.sourceControl.warn('findRepositoryById: repository not found', { id });
    }
    return repo ?? null;
  },

  async softDeleteRepository(id: string, userId: string): Promise<void> {
    logger.sourceControl.info('softDeleteRepository', { id, userId });
    await db
      .update(repositories)
      .set({ deletedAt: new Date(), deletedBy: userId, updatedAt: new Date(), updatedBy: userId })
      .where(eq(repositories.id, id));
    logger.sourceControl.info('softDeleteRepository completed', { id });
  },

  async markImportUninstalled(id: string): Promise<void> {
    logger.sourceControl.info('markImportUninstalled', { id });
    await db
      .update(sourceControlImports)
      .set({ uninstalledAt: new Date(), updatedAt: new Date() })
      .where(eq(sourceControlImports.id, id));
    logger.sourceControl.info('markImportUninstalled completed', { id });
  },

  async findActiveImportsByConnectionId(connectionId: string): Promise<SourceControlImport[]> {
    logger.sourceControl.info('findActiveImportsByConnectionId', { connectionId });
    try {
      const rows = await db
        .select()
        .from(sourceControlImports)
        .where(and(
          eq(sourceControlImports.sourceControlId, connectionId),
          isNull(sourceControlImports.uninstalledAt),
        ));
      logger.sourceControl.info('findActiveImportsByConnectionId completed', { connectionId, count: rows.length });
      return rows;
    } catch (error) {
      logger.sourceControl.error('findActiveImportsByConnectionId failed', { connectionId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },
};
