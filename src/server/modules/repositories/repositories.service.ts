import { repositoriesRepository } from './repositories.repository';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';
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
   *
   * @param workspaceId - Workspace UUID to scope the query
   * @returns Array of repository records
   */
  async list(workspaceId: string) {
    logger.repository.info('listRepositories', { workspaceId });
    const result = await repositoriesRepository.listByWorkspace(workspaceId);
    logger.repository.info('listRepositories completed', { count: result.length });
    return result;
  },

  /**
   * Retrieves a single repository by ID within a workspace.
   *
   * @param id - Repository UUID
   * @param workspaceId - Workspace UUID for scope validation
   * @returns Repository record
   * @throws {AppError} 404 - Repository not found
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
   *
   * @param data - Repository creation data (projectId, name, url, etc.)
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID of the creator
   * @returns Created repository record
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async create(data: unknown, workspaceId: string, userId: string) {
    logger.repository.info('createRepository', { workspaceId });
    await assertWorkspaceMember(workspaceId, userId);

    const input = data as {
      projectId: string;
      sourceControlId?: string;
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType?: string[];
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
   *
   * @param id - Repository UUID to update
   * @param data - Partial update data (name, url, defaultBranch, etc.)
   * @param workspaceId - Workspace UUID for scope validation
   * @param userId - User UUID performing the update
   * @returns Updated repository record
   * @throws {AppError} 403 - User is not a member of the workspace
   * @throws {AppError} 404 - Repository not found
   */
  async update(id: string, data: unknown, workspaceId: string, userId: string) {
    logger.repository.info('updateRepository', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
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
      connectionType?: string[];
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
   *
   * @param id - Repository UUID to delete
   * @param workspaceId - Workspace UUID for scope validation
   * @param userId - User UUID performing the deletion
   * @returns Soft-deleted repository record
   * @throws {AppError} 403 - User is not a member of the workspace
   * @throws {AppError} 404 - Repository not found
   */
  async delete(id: string, workspaceId: string, userId: string) {
    logger.repository.info('deleteRepository', { id, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const existing = await repositoriesRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Repository not found', 404, 'NOT_FOUND');
    }

    await repositoriesRepository.delete(id);
    logger.repository.info('deleteRepository completed', { id });
    return existing;
  },
};
