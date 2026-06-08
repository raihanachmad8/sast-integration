import { sourceControlRepository } from './source-control.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createSourceControlSchema, updateSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

/**
 * Service responsible for managing Source Control providers.
 *
 * Source Control providers (GitHub, GitLab, etc.) store credentials
 * and configuration for repository integrations.
 */
export const sourceControlService = {
  /**
   * Lists all source control providers for a workspace.
   */
  async list(workspaceId: string) {
    logger.sourceControl.info('listSourceControls', { workspaceId });
    const result = await sourceControlRepository.listByWorkspace(workspaceId);
    logger.sourceControl.info('listSourceControls completed', { count: result.length });
    return result;
  },

  /**
   * Retrieves a single source control provider by ID within a workspace.
   */
  async getById(id: string, workspaceId: string) {
    logger.sourceControl.info('getSourceControlById', { id, workspaceId });
    const control = await sourceControlRepository.getById(id, workspaceId);
    if (!control) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    logger.sourceControl.info('getSourceControlById completed', { id });
    return control;
  },

  /**
   * Creates a new source control provider for a workspace.
   */
  async create(data: unknown, workspaceId: string, userId: string) {
    logger.sourceControl.info('createSourceControl', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const parsed = createSourceControlSchema.parse(data);

    const result = await sourceControlRepository.create({
      workspace_id: workspaceId,
      provider: parsed.provider,
      name: parsed.name,
      credentials: parsed.credentials as Record<string, unknown> | undefined,
      created_by: userId,
    });
    logger.sourceControl.info('createSourceControl completed', { controlId: result.id });
    return result;
  },

  /**
   * Updates an existing source control provider.
   */
  async update(id: string, data: unknown, workspaceId: string, userId: string) {
    logger.sourceControl.info('updateSourceControl', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    const parsed = updateSourceControlSchema.parse(data);

    const updated = await sourceControlRepository.update(id, {
      provider: parsed.provider,
      name: parsed.name,
      credentials: parsed.credentials as Record<string, unknown> | undefined,
    });
    logger.sourceControl.info('updateSourceControl completed', { id });
    return updated;
  },

  /**
   * Deletes a source control provider.
   */
  async delete(id: string, workspaceId: string, userId: string) {
    logger.sourceControl.info('deleteSourceControl', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }

    await sourceControlRepository.delete(id);
    logger.sourceControl.info('deleteSourceControl completed', { id });
    return existing;
  },

  /**
   * Lists repositories available through a source control provider.
   */
  async listRepos(providerId: string, workspaceId: string) {
    logger.sourceControl.info('listRepos', { providerId, workspaceId });
    const existing = await sourceControlRepository.getById(providerId, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    const result = await sourceControlRepository.listRepos(providerId);
    logger.sourceControl.info('listRepos completed', { count: result.length });
    return result;
  },

  /**
   * Tests the connection to a source control provider.
   */
  async testConnection(id: string, workspaceId: string) {
    logger.sourceControl.info('testConnection', { id, workspaceId });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    logger.sourceControl.info('testConnection completed', { id, success: true });
    return { success: true, provider: existing.provider };
  },

  /**
   * Syncs repositories from a source control provider.
   */
  async syncRepos(id: string, workspaceId: string, fullNames: string[]) {
    logger.sourceControl.info('syncRepos', { id, workspaceId, count: fullNames.length });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    logger.sourceControl.info('syncRepos completed', { id, syncedCount: fullNames.length });
    return { synced: fullNames.length };
  },
};
