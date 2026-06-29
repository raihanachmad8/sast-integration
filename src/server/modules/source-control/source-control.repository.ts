import { eq, and, isNull, count } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { sourceControls, sourceControlRepositories, sourceControlImports } from '@drizzle/schema/source-controls';

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

export interface SourceControlListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: string;
}

export const sourceControlRepository = {
  /**
   * List source control integrations in a workspace with search, sort, and pagination.
   */
  async list(workspaceId: string, params?: SourceControlListParams, tx?: Tx) {
    logger.sourceControl.info('list', { workspaceId });
    const executor = tx ?? db;

    const conditions = [
      eq(sourceControls.workspaceId, workspaceId),
      ...buildSearch(params?.search, sourceControls.name),
    ];

    // Count total
    const [{ total }] = await executor
      .select({ total: count() })
      .from(sourceControls)
      .where(and(...conditions));

    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: sourceControls.name, provider: sourceControls.provider, createdAt: sourceControls.createdAt },
      sourceControls.createdAt,
    );

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const rows = await executor
      .select()
      .from(sourceControls)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.sourceControl.info('list completed', { workspaceId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * List all source control integrations.
   */
  async listAll(tx?: Tx) {
    logger.sourceControl.info('listAll');
    const executor = tx ?? db;
    const rows = await executor.select().from(sourceControls).limit(500);
    logger.sourceControl.info('listAll completed', { count: rows.length });
    return rows;
  },

  /**
   * Get a source control integration by ID scoped to a workspace.
   */
  async getById(workspaceId: string, id: string, tx?: Tx) {
    logger.sourceControl.info('getById', { id, workspaceId });
    const executor = tx ?? db;
    const [control] = await executor
      .select()
      .from(sourceControls)
      .where(and(eq(sourceControls.id, id), eq(sourceControls.workspaceId, workspaceId)))
      .limit(1);
    if (!control) {
      logger.sourceControl.warn('getById: source control not found', { id, workspaceId });
    }
    return control ?? null;
  },

  /**
   * Get source control by ID without workspace scoping (for internal use).
   */
  async getByIdRaw(id: string, tx?: Tx) {
    logger.sourceControl.info('getByIdRaw', { id });
    const executor = tx ?? db;
    const [control] = await executor
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.id, id))
      .limit(1);
    if (!control) {
      logger.sourceControl.warn('getByIdRaw: source control not found', { id });
    }
    return control ?? null;
  },

  /**
   * Create a new source control integration record.
   */
  async create(data: CreateSourceControlInput, tx?: Tx) {
    logger.sourceControl.info('create', { workspaceId: data.workspaceId, provider: data.provider, name: data.name });
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
    logger.sourceControl.info('create completed', { id: control.id });
    return control;
  },

  /**
   * Update a source control integration record.
   */
  async update(id: string, data: UpdateSourceControlInput, tx?: Tx) {
    logger.sourceControl.info('update', { id });
    const executor = tx ?? db;
    const [control] = await executor
      .update(sourceControls)
      .set(data)
      .where(eq(sourceControls.id, id))
      .returning();
    if (!control) {
      logger.sourceControl.warn('update: source control not found', { id });
    }
    return control ?? null;
  },

  /**
   * Delete a source control integration record.
   */
  async delete(id: string, tx?: Tx) {
    logger.sourceControl.info('delete', { id });
    const executor = tx ?? db;
    await executor.delete(sourceControls).where(eq(sourceControls.id, id));
    logger.sourceControl.info('delete completed', { id });
  },

  /**
   * Find the source control import for a repository.
   */
  async findImportByRepositoryId(repositoryId: string, workspaceId: string, tx?: Tx) {
    logger.sourceControl.info('findImportByRepositoryId', { repositoryId, workspaceId });
    const executor = tx ?? db;
    const [result] = await executor
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
    if (!result) {
      logger.sourceControl.warn('findImportByRepositoryId: no import found', { repositoryId, workspaceId });
    }
    return result ?? null;
  },
};
