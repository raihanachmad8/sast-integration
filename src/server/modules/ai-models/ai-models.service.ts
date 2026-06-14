import { aiModelsRepository } from './ai-models.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createAiModelSchema, updateAiModelSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

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
  async createModel(workspaceId: string, input: unknown, userId: string) {
    logger.model.info('createModel', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
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
  async getModelById(id: string, workspaceId?: string) {
    logger.model.info('getModelById', { id });
    const model = await aiModelsRepository.findById(id, workspaceId);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    logger.model.info('getModelById completed', { id });
    return model;
  },

  /**
   * Lists all AI models belonging to a workspace.
   */
  async listModelsByWorkspace(workspaceId: string) {
    logger.model.info('listModelsByWorkspace', { workspaceId });
    const result = await aiModelsRepository.findByWorkspace(workspaceId);
    logger.model.info('listModelsByWorkspace completed', { count: result.length });
    return result;
  },

  /**
   * Updates an existing AI model.
   */
  async updateModel(id: string, workspaceId: string, input: unknown, userId: string) {
    logger.model.info('updateModel', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = updateAiModelSchema.parse(input);

    const updated = await aiModelsRepository.update(id, workspaceId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
      ...(data.apiKey !== undefined && { apiKeyEncrypted: data.apiKey }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.promptPreset !== undefined && { prompt_preset: data.promptPreset }),
      ...(data.customSystemPrompt !== undefined && { custom_system_prompt: data.customSystemPrompt }),
    });
    if (!updated) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    logger.model.info('updateModel completed', { id });
    return updated;
  },

  /**
   * Deletes an AI model from a workspace.
   */
  async deleteModel(id: string, workspaceId: string, userId: string) {
    logger.model.info('deleteModel', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const model = await aiModelsRepository.findById(id, workspaceId);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }

    await aiModelsRepository.delete(id, workspaceId);
    logger.model.info('deleteModel completed', { id });
  },
};
