import { eq, and, isNull } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort } from '@/server/lib/query';
import { repositories } from '@drizzle/schema/source-controls';

export interface CreateRepositoryInput {
  workspaceId: string;
  projectId: string;
  name: string;
  url: string;
  defaultBranch?: string;
  connectionType?: string[];
  autoScan?: boolean;
  createdBy?: string;
}

export interface UpdateRepositoryInput {
  projectId?: string;
  sourceControlId?: string;
  name?: string;
  url?: string;
  defaultBranch?: string;
  connectionType?: string[];
  autoScan?: boolean;
  webhookId?: string;
  webhookSecret?: string;
}

export interface RepositoryListParams {
  search?: string;
  sort?: string;
  order?: string;
}

export const repositoriesRepository = {
  async list(workspaceId: string, params?: RepositoryListParams) {
    logger.repository.info('list', { workspaceId });
    const conditions = [
      eq(repositories.workspaceId, workspaceId),
      isNull(repositories.deletedAt),
      ...buildSearch(params?.search, repositories.name),
    ];
    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: repositories.name, url: repositories.url, defaultBranch: repositories.defaultBranch, createdAt: repositories.createdAt },
      repositories.createdAt,
    );
    const rows = await db
      .select()
      .from(repositories)
      .where(and(...conditions))
      .orderBy(sortExpr);
    logger.repository.info('list completed', { workspaceId, count: rows.length });
    return rows;
  },

  async getById(workspaceId: string, id: string) {
    logger.repository.info('getById', { id, workspaceId });
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.id, id), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    if (!repo) {
      logger.repository.warn('getById: repository not found', { id, workspaceId });
    }
    return repo ?? null;
  },

  async create(data: CreateRepositoryInput, tx?: Tx) {
    logger.repository.info('create', { workspaceId: data.workspaceId, name: data.name });
    try {
      const executor = tx ?? db;
      const [repo] = await executor
        .insert(repositories)
        .values({
          workspaceId: data.workspaceId,
          projectId: data.projectId,
          name: data.name,
          url: data.url,
          defaultBranch: data.defaultBranch ?? 'main',
          connectionType: data.connectionType ?? ['scm'],
          autoScan: data.autoScan ?? false,
          ...(data.createdBy && { createdBy: data.createdBy, updatedBy: data.createdBy }),
        })
        .returning();
      logger.repository.info('create completed', { repoId: repo.id, name: data.name });
      return repo;
    } catch (error) {
      logger.repository.error('create failed', { workspaceId: data.workspaceId, name: data.name, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  async update(id: string, data: UpdateRepositoryInput, tx?: Tx) {
    logger.repository.info('update', { id });
    try {
      const executor = tx ?? db;
      const [repo] = await executor
        .update(repositories)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(repositories.id, id))
        .returning();
      if (!repo) {
        logger.repository.warn('update: repository not found', { id });
      }
      return repo ?? null;
    } catch (error) {
      logger.repository.error('update failed', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  async delete(id: string, tx?: Tx) {
    logger.repository.info('delete', { id });
    try {
      const executor = tx ?? db;
      await executor
        .update(repositories)
        .set({ deletedAt: new Date() })
        .where(eq(repositories.id, id));
      logger.repository.info('delete completed', { id });
    } catch (error) {
      logger.repository.error('delete failed', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  async findByUrl(url: string, workspaceId: string, tx?: Tx) {
    logger.repository.info('findByUrl', { url, workspaceId });
    const executor = tx ?? db;
    const [repo] = await executor
      .select()
      .from(repositories)
      .where(and(eq(repositories.url, url), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    if (!repo) {
      logger.repository.warn('findByUrl: repository not found', { url, workspaceId });
    }
    return repo ?? null;
  },

  async findByName(workspaceId: string, name: string, tx?: Tx) {
    logger.repository.info('findByName', { name, workspaceId });
    const executor = tx ?? db;
    const [repo] = await executor
      .select()
      .from(repositories)
      .where(and(eq(repositories.name, name), eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .limit(1);
    if (!repo) {
      logger.repository.warn('findByNameAndWorkspace: repository not found', { name, workspaceId });
    }
    return repo ?? null;
  },

  async findOrCreate(data: CreateRepositoryInput, tx?: Tx) {
    logger.repository.info('findOrCreate', { workspaceId: data.workspaceId, name: data.name });
    try {
      const executor = tx ?? db;

      const [inserted] = await executor
        .insert(repositories)
        .values({
          workspaceId: data.workspaceId,
          projectId: data.projectId,
          name: data.name,
          url: data.url,
          defaultBranch: data.defaultBranch ?? 'main',
          connectionType: data.connectionType ?? ['scm'],
          autoScan: data.autoScan ?? false,
          ...(data.createdBy && { createdBy: data.createdBy, updatedBy: data.createdBy }),
        })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        logger.repository.info('findOrCreate completed (inserted)', { repoId: inserted.id, name: data.name });
        return inserted;
      }

      const [existing] = await executor
        .select()
        .from(repositories)
        .where(and(
          eq(repositories.name, data.name),
          eq(repositories.workspaceId, data.workspaceId),
          isNull(repositories.deletedAt),
        ))
        .limit(1);

      if (existing) {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (data.projectId && !existing.projectId) updates.projectId = data.projectId;

        if (data.connectionType?.length) {
          const current = Array.isArray(existing.connectionType) ? existing.connectionType : [];
          const merged = [...new Set([...current, ...data.connectionType])];
          if (merged.length !== current.length) updates.connectionType = merged;
        }

        if (Object.keys(updates).length > 1) {
          await executor.update(repositories).set(updates).where(eq(repositories.id, existing.id));
          logger.repository.info('findOrCreate completed (updated existing)', { repoId: existing.id, name: data.name });
          return { ...existing, ...updates };
        }
        logger.repository.info('findOrCreate completed (existing unchanged)', { repoId: existing.id, name: data.name });
        return existing;
      }

      const [softDeleted] = await executor
        .select()
        .from(repositories)
        .where(and(
          eq(repositories.name, data.name),
          eq(repositories.workspaceId, data.workspaceId),
        ))
        .limit(1);

      if (softDeleted) {
        logger.repository.info('findOrCreate: restoring soft-deleted repository', { repoId: softDeleted.id, name: data.name });
        const [restored] = await executor
          .update(repositories)
          .set({
            deletedAt: null,
            deletedBy: null,
            url: data.url,
            projectId: data.projectId,
            defaultBranch: data.defaultBranch ?? 'main',
            connectionType: data.connectionType ?? ['scm'],
            updatedAt: new Date(),
          })
          .where(eq(repositories.id, softDeleted.id))
          .returning();
        return restored ?? softDeleted;
      }

      logger.repository.warn('findOrCreate: no matching repository found', { name: data.name, workspaceId: data.workspaceId });
      return existing!;
    } catch (error) {
      logger.repository.error('findOrCreate failed', { name: data.name, workspaceId: data.workspaceId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },
};
