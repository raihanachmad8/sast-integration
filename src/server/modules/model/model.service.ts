import { modelRepository } from './model.repository';
import { createAiModelSchema, updateAiModelSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

/**
 * Service responsible for managing AI Models.
 *
 * AI Models define the LLM providers used for vulnerability analysis,
 * including primary/fallback roles, prompt presets, and API configuration.
 */
export const modelService = {
  /**
   * Creates a new AI model for a workspace.
   */
  async createModel(workspaceId: string, input: unknown) {
    const data = createAiModelSchema.parse(input);

    return modelRepository.create({
      workspaceId,
      name: data.name,
      provider: data.provider,
      base_url: data.base_url,
      api_key_encrypted: data.api_key_encrypted ?? null,
      role: data.role,
      priority: data.priority,
      prompt_preset: data.prompt_preset,
      custom_system_prompt: data.custom_system_prompt ?? null,
    });
  },

  /**
   * Retrieves a single AI model by ID within a workspace.
   */
  async getModelById(id: string, workspaceId?: string) {
    const model = await modelRepository.findById(id, workspaceId);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    return model;
  },

  /**
   * Lists all AI models belonging to a workspace.
   */
  async listModelsByWorkspace(workspaceId: string) {
    return modelRepository.findByWorkspace(workspaceId);
  },

  /**
   * Updates an existing AI model.
   */
  async updateModel(id: string, workspaceId: string, input: unknown) {
    const data = updateAiModelSchema.parse(input);

    const updated = await modelRepository.update(id, workspaceId, data);
    if (!updated) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  /**
   * Deletes an AI model from a workspace.
   */
  async deleteModel(id: string, workspaceId: string) {
    const model = await modelRepository.findById(id, workspaceId);
    if (!model) {
      throw new AppError('AI model not found', 404, 'NOT_FOUND');
    }

    await modelRepository.delete(id, workspaceId);
  },
};
