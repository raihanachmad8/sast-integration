import { repositoriesRepository } from './repositories.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

/**
 * Service responsible for managing Repositories.
 *
 * Repositories represent code repositories linked to projects,
 * with support for source control integration and scan configuration.
 */
export const repositoriesService = {
  /**
   * Lists all repositories belonging to a workspace.
   */
  async list(workspaceId: string) {
    logger.repository.info('listRepositories', { workspaceId });
    const result = await repositoriesRepository.listByWorkspace(workspaceId);
    logger.repository.info('listRepositories completed', { count: result.length });
    return result;
  },

  /**
   * Retrieves a single repository by ID within a workspace.
   */
  async getById(id: string, workspaceId: string) {
    logger.repository.info('getRepositoryById', { id, workspaceId });
    const repo = await repositoriesRepository.getById(id, workspaceId);
    if (!repo) {
      throw new AppError('Repository not found', 404, 'NOT_FOUND');
    }
    logger.repository.info('getRepositoryById completed', { id });
    return repo;
  },

  /**
   * Creates a new repository for a workspace.
   */
  async create(data: unknown, workspaceId: string, userId: string) {
    logger.repository.info('createRepository', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const input = data as {
      projectId: string;
      sourceControlId?: string;
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType?: string;
      autoScan?: boolean;
    };

    const result = await repositoriesRepository.create({
      workspaceId: workspaceId,
      projectId: input.projectId,
      name: input.name,
      url: input.url,
      defaultBranch: input.defaultBranch,
      connectionType: input.connectionType,
      autoScan: input.autoScan,
      createdBy: userId,
    });
    logger.repository.info('createRepository completed', { repositoryId: result.id });
    return result;
  },

  /**
   * Updates an existing repository.
   */
  async update(id: string, data: unknown, workspaceId: string, userId: string) {
    logger.repository.info('updateRepository', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await repositoriesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Repository not found', 404, 'NOT_FOUND');
    }

    const input = data as {
      projectId?: string;
      sourceControlId?: string;
      name?: string;
      url?: string;
      defaultBranch?: string;
      connectionType?: string;
      autoScan?: boolean;
      webhookId?: string;
      webhookSecret?: string;
    };

    const updated = await repositoriesRepository.update(id, {
      projectId: input.projectId,
      name: input.name,
      url: input.url,
      defaultBranch: input.defaultBranch,
      connectionType: input.connectionType,
      autoScan: input.autoScan,
    });
    logger.repository.info('updateRepository completed', { id });
    return updated;
  },

  /**
   * Deletes a repository.
   */
  async delete(id: string, workspaceId: string, userId: string) {
    logger.repository.info('deleteRepository', { id, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await repositoriesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Repository not found', 404, 'NOT_FOUND');
    }

    await repositoriesRepository.delete(id);
    logger.repository.info('deleteRepository completed', { id });
    return existing;
  },
};
