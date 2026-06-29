import { createAiModelSchema, updateAiModelSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';

import { aiModelsRepository } from './ai-models.repository';

/**
 * Service responsible for managing AI Models.
 *
 * AI Models define the LLM providers used for vulnerability analysis,
 * including primary/fallback roles, prompt presets, and API configuration.
 */
export const aiModelsService = {
  /**
   * Creates a new AI model for a workspace.
   */
  async create(workspaceId: string, input: unknown, userId: string) {
    logger.model.info('create', { workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const data = createAiModelSchema.parse(input);

    const result = await aiModelsRepository.create({
      workspaceId,
      name: data.name,
      provider: data.provider,
      baseUrl: data.baseUrl ?? '',
      apiKeyEncrypted: data.apiKey ?? null,
      role: data.role,
      priority: data.priority,
      promptPreset: data.promptPreset,
      customSystemPrompt: data.customSystemPrompt ?? null,
    });
    logger.model.info('createModel completed', { modelId: result.id });
    return result;
  },

  /**
   * Retrieves a single AI model by ID within a workspace.
   */
  async getById(workspaceId: string, id: string) {
    logger.model.info('getById', { id, workspaceId });
    const model = await aiModelsRepository.findById(workspaceId, id);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    logger.model.info('getById completed', { id });
    return model;
  },

  /**
   * Lists all AI models belonging to a workspace.
   */
  async list(workspaceId: string, params?: { page?: number; perPage?: number; search?: string; sort?: string; order?: string }) {
    logger.model.info('list', { workspaceId });
    const result = await aiModelsRepository.list(workspaceId, params);
    logger.model.info('list completed', { total: result.total });
    return result;
  },

  /**
   * Updates an existing AI model.
   */
  async update(workspaceId: string, id: string, input: unknown, userId: string) {
    logger.model.info('update', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const data = updateAiModelSchema.parse(input);

    const updated = await aiModelsRepository.update(workspaceId, id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
      ...(data.apiKey !== undefined && { apiKeyEncrypted: data.apiKey }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.promptPreset !== undefined && { promptPreset: data.promptPreset }),
      ...(data.customSystemPrompt !== undefined && { customSystemPrompt: data.customSystemPrompt }),
    });
    if (!updated) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    logger.model.info('update completed', { id });
    return updated;
  },

  /**
   * Deletes an AI model from a workspace.
   */
  async remove(workspaceId: string, id: string, userId: string) {
    logger.model.info('deleteModel', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const model = await aiModelsRepository.findById(workspaceId, id);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }

    await aiModelsRepository.delete(workspaceId, id);
    logger.model.info('remove completed', { id });
  },
};
