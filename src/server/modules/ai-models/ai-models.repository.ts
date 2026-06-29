import { eq, and, count } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { models } from '@drizzle/schema/integrations';

export interface CreateAiModelInput {
  workspaceId: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKeyEncrypted?: string | null;
  role?: string;
  priority?: number;
  promptPreset?: string;
  customSystemPrompt?: string | null;
}

export interface UpdateAiModelInput {
  name?: string;
  provider?: string;
  baseUrl?: string;
  apiKeyEncrypted?: string | null;
  role?: string;
  priority?: number;
  promptPreset?: string;
  customSystemPrompt?: string | null;
  status?: string;
  lastTestedAt?: Date;
}

export interface AiModelListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: string;
}

export const aiModelsRepository = {
  /**
   * Create a new AI model configuration record.
   */
  async create(data: CreateAiModelInput, tx?: Tx) {
    logger.model.info('create', { workspaceId: data.workspaceId, name: data.name });
    const executor = tx ?? db;

    const [model] = await executor
      .insert(models)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        provider: data.provider,
        baseUrl: data.baseUrl,
        apiKeyEncrypted: data.apiKeyEncrypted ?? null,
        role: data.role ?? 'fallback',
        priority: data.priority ?? 1,
        promptPreset: data.promptPreset ?? 'strict',
        customSystemPrompt: data.customSystemPrompt ?? null,
      })
      .returning();

    logger.model.info('create completed', { modelId: model.id });
    return model;
  },

  /**
   * Find an AI model by ID, scoped to a workspace.
   */
  async findById(workspaceId: string, id: string, tx?: Tx) {
    logger.model.info('findById', { id, workspaceId });
    const executor = tx ?? db;
    const conditions = [eq(models.id, id), eq(models.workspaceId, workspaceId)];
    const [model] = await executor
      .select()
      .from(models)
      .where(and(...conditions))
      .limit(1);

    if (!model) {
      logger.model.warn('findById: model not found', { id, workspaceId });
    }
    return model ?? null;
  },

  /**
   * List AI model configurations in a workspace with search, sort, and pagination.
   */
  async list(workspaceId: string, params?: AiModelListParams, tx?: Tx) {
    logger.model.info('list', { workspaceId });
    const executor = tx ?? db;

    const conditions = [
      eq(models.workspaceId, workspaceId),
      ...buildSearch(params?.search, models.name),
    ];

    // Count total
    const [{ total }] = await executor
      .select({ total: count() })
      .from(models)
      .where(and(...conditions));

    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: models.name, provider: models.provider, priority: models.priority, createdAt: models.createdAt },
      models.priority,
    );

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const rows = await executor
      .select()
      .from(models)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.model.info('list completed', { workspaceId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * Update an AI model configuration record.
   */
  async update(workspaceId: string, id: string, data: UpdateAiModelInput, tx?: Tx) {
    logger.model.info('update', { id, workspaceId });
    const executor = tx ?? db;

    const [updated] = await executor
      .update(models)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
        ...(data.apiKeyEncrypted !== undefined && { apiKeyEncrypted: data.apiKeyEncrypted }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.promptPreset !== undefined && { promptPreset: data.promptPreset }),
        ...(data.customSystemPrompt !== undefined && { customSystemPrompt: data.customSystemPrompt }),
        updatedAt: new Date(),
      })
      .where(and(eq(models.id, id), eq(models.workspaceId, workspaceId)))
      .returning();

    logger.model.info('update completed', { id });
    return updated ?? null;
  },

  /**
   * Delete an AI model configuration record.
   */
  async delete(workspaceId: string, id: string, tx?: Tx) {
    logger.model.info('delete', { id, workspaceId });
    const executor = tx ?? db;

    await executor
      .delete(models)
      .where(and(eq(models.id, id), eq(models.workspaceId, workspaceId)));

    logger.model.info('delete completed', { id });
  },
};
