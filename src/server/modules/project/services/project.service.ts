import { PERMISSION } from '@/commons/constants/permissions';
import type { ProjectFormInput as CreateProjectInput, ProjectUpdateInput as UpdateProjectInput, ProjectListQuery } from '@/commons/schemas';
import type { ProjectMemberSummary, ProjectTeamSummary, ProjectRepositorySummary } from '@/commons/types';
import { generateSlug } from '@/commons/utils/slug';
import { db } from '@/server/db/client';
import { assertHasPermission } from '@/server/http/authorization';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';

import { PROJECT } from '../constants';
import { projectRepository } from '../repositories/project.repository';

import { projectApiTokenService } from './project-api-token.service';



/**
 * Project service following the established workspace module patterns.
 * Projects are strictly scoped to a workspace.
 */
export const projectService = {
  /**
   * List all projects belonging to a workspace.
   *
   * @param workspaceId - Workspace UUID to scope the query
   * @param userId - User UUID requesting the list
   * @returns Array of projects with member, team, and repository summaries
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async list(workspaceId: string, userId: string, params?: ProjectListQuery) {
    logger.project.info('list', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }

    const { data: rows, total, page, perPage, lastPage } = await projectRepository.list(workspaceId, params);
    if (rows.length === 0) {
      logger.project.info('list completed', { count: 0 });
      return { data: [], total, page, perPage, lastPage };
    }

    const projectIds = rows.map((p) => p.id);
    const [membersMap, teamsMap, repositoriesMap] = await Promise.all([
      projectRepository.listMemberSummariesByProjectIds(projectIds),
      projectRepository.listTeamSummariesByProjectIds(projectIds),
      projectRepository.listRepositorySummariesByProjectIds(projectIds),
    ]);

    const data = rows.map((p) => ({
      ...p,
      members: membersMap.get(p.id) ?? [] as ProjectMemberSummary[],
      teams: teamsMap.get(p.id) ?? [] as ProjectTeamSummary[],
      repositories: repositoriesMap.get(p.id) ?? [] as ProjectRepositorySummary[],
    }));

    logger.project.info('list completed', { count: data.length });
    return { data, total, page, perPage, lastPage };
  },

  /**
   * Get a single project by ID.
   *
   * @param projectId - Project UUID
   * @param userId - User UUID requesting the project
   * @returns Project record with members, teams, and repositories
   * @throws {AppError} 404 - Project not found
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async getById(workspaceId: string, projectId: string, userId: string) {
    logger.project.info('getById', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }

    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    const [members, teams, repositories] = await Promise.all([
      projectRepository.listMemberSummaries(projectId),
      projectRepository.listTeamSummaries(projectId),
      projectRepository.listRepositorySummaries(projectId),
    ]);

    logger.project.info('getById completed', { projectId });
    return { ...project, members, teams, repositories };
  },

  /**
   * List members of a project (direct + team-based, deduplicated).
   *
   * @param projectId - Project UUID
   * @param userId - User UUID requesting the list
   * @returns Array of member summaries
   * @throws {AppError} 404 - Project not found
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async listMembers(projectId: string, userId: string) {
    logger.project.info('listMembers', { projectId });
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspaceId) {
      const role = await workspaceRepository.getMemberRole(project.workspaceId, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectRepository.listMemberSummaries(projectId);
    logger.project.info('listMembers completed', { projectId, count: result.length });
    return result;
  },

  /**
   * Create a new project inside a workspace.
   *
   * @param input - Project creation data (name, slug, description, etc.)
   * @param workspaceId - Workspace UUID to create the project in
   * @param userId - User UUID of the creator
   * @returns Created project record
   * @throws {AppError} 409 - Slug already exists in this workspace
   */
  async create(workspaceId: string, input: CreateProjectInput, userId: string) {
    logger.project.info('create', { workspaceId, name: input.name });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    assertHasPermission(role, PERMISSION.PROJECT_MANAGE, PROJECT.ERROR_CODE);

    if (input.slug) {
      const existing = await projectRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        logger.project.warn('create slug conflict', { workspaceId, slug: input.slug });
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    if (input.memberIds && input.memberIds.length === 0) {
      logger.project.warn('create called with empty memberIds', { workspaceId, name: input.name });
    }
    if (input.teamIds && input.teamIds.length === 0) {
      logger.project.warn('create called with empty teamIds', { workspaceId, name: input.name });
    }
    if (input.repositoryIds && input.repositoryIds.length === 0) {
      logger.project.warn('create called with empty repositoryIds', { workspaceId, name: input.name });
    }

    try {
      const result = await db.transaction(async (tx) => {
        const project = await projectRepository.create({
          workspaceId,
          name: input.name,
          slug: input.slug || generateSlug(input.name, PROJECT.MAX_SLUG_LENGTH),
          description: input.description,
          createdBy: userId,
        }, tx);

        if (input.memberIds?.length) {
          await projectRepository.setMembers(project.id, input.memberIds, tx);
        }
        if (input.teamIds?.length) {
          await projectRepository.setTeams(project.id, input.teamIds, tx);
        }
        if (input.repositoryIds) {
          await projectRepository.setRepositories(project.id, input.repositoryIds, tx);
        }

        return project;
      });

      logger.project.info('create completed', { projectId: result.id });
      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.project.error('create failed', { workspaceId, name: input.name, error: err });
      throw err;
    }
  },

  /**
   * Update project (full replace — PUT semantics).
   *
   * @param projectId - Project UUID to update
   * @param input - Complete project data (all fields expected)
   * @param userId - User UUID performing the update
   * @returns Updated project record
   * @throws {AppError} 404 - Project not found
   * @throws {AppError} 403 - User is not a member of the workspace
   * @throws {AppError} 409 - Slug already exists in this workspace
   */
  async update(workspaceId: string, projectId: string, input: UpdateProjectInput, userId: string) {
    logger.project.info('update', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.project.warn('update not member', { projectId, userId });
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }
    assertHasPermission(role, PERMISSION.PROJECT_MANAGE, PROJECT.ERROR_CODE);

    const project = await projectRepository.findById(projectId);
    if (!project) {
      logger.project.warn('update project not found', { projectId });
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (input.slug && input.slug !== project.slug) {
      const existing = await projectRepository.findBySlug(project.workspaceId!, input.slug);
      if (existing) {
        logger.project.warn('update slug conflict', { projectId, slug: input.slug });
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    try {
      const updateData: Record<string, unknown> = {
        name: input.name,
        slug: input.slug,
        description: input.description,
        lead: input.lead,
        updatedBy: userId,
      };

      const result = await projectRepository.update(projectId, updateData);

      // Always replace all relation arrays (PUT = full replace)
      await db.transaction(async (tx) => {
        await projectRepository.setMembers(projectId, input.memberIds ?? [], tx);
        await projectRepository.setTeams(projectId, input.teamIds ?? [], tx);
        await projectRepository.setRepositories(projectId, input.repositoryIds ?? [], tx);
      });

      logger.project.info('update completed', { projectId });
      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.project.error('update failed', { projectId, error: err });
      throw err;
    }
  },

  /**
   * Soft delete a project.
   *
   * @param projectId - Project UUID to soft-delete
   * @param userId - User UUID performing the deletion
   * @returns Soft-deleted project record
   * @throws {AppError} 404 - Project not found
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async softDelete(workspaceId: string, projectId: string, userId: string) {
    logger.project.info('softDelete', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.project.warn('softDelete not member', { projectId, userId });
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }
    assertHasPermission(role, PERMISSION.PROJECT_MANAGE, PROJECT.ERROR_CODE);

    try {
      const result = await projectRepository.softDelete(projectId, userId);
      logger.project.info('softDelete completed', { projectId });
      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.project.error('softDelete failed', { projectId, error: err });
      throw err;
    }
  },

  /**
   * List repositories attached to this project.
   *
   * @param projectId - Project UUID
   * @param userId - User UUID requesting the list
   * @returns Array of repository records attached to the project
   * @throws {AppError} 404 - Project not found
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async listRepositories(projectId: string, userId: string) {
    logger.project.info('listRepositories', { projectId });
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspaceId) {
      const role = await workspaceRepository.getMemberRole(project.workspaceId, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectRepository.listRepositories(projectId);
    logger.project.info('listRepositories completed', { count: result.length });
    return result;
  },

  /**
   * List all repositories across all projects in a workspace.
   */
  async listRepositoriesByWorkspace(workspaceId: string, accessibleProjectIds?: string[]) {
    logger.project.info('listRepositoriesByWorkspace', { workspaceId });
    const result = await projectRepository.listRepositoriesByWorkspace(workspaceId, undefined, accessibleProjectIds);
    const mapped = result.data.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      branch: row.defaultBranch ?? 'main',
      status: 'active' as const,
      project: row.projectName,
      policyName: null,
      connectionType: (Array.isArray(row.connectionType) ? row.connectionType : row.connectionType ? [row.connectionType as string] : ['scm']) as string[],
      provider: null,
      findings: 0,
      scans: 0,
      lastScan: row.lastSyncedAt?.toISOString() ?? null,
    }));
    logger.project.info('listRepositoriesByWorkspace completed', { count: mapped.length });
    return mapped;
  },

  /**
   * Attach or create a repository under this project.
   */
  async attachRepository(
    projectId: string,
    data: {
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType: string[];
      sourceControlId?: string;
    },
    userId: string
  ) {
    logger.project.info('attachRepository', { projectId, name: data.name });
    const project = await projectRepository.findById(projectId);
    if (!project) {
      logger.project.warn('attachRepository project not found', { projectId });
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspaceId) {
      const role = await workspaceRepository.getMemberRole(project.workspaceId, userId);
      if (!role) {
        logger.project.warn('attachRepository not member', { projectId, userId });
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    try {
      const result = await projectRepository.attachRepository(projectId, project.workspaceId, data, userId);
      logger.project.info('attachRepository completed', { projectId });
      return result;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.project.error('attachRepository failed', { projectId, name: data.name, error: err });
      throw err;
    }
  },

  // ============================================================
  // Project API Token management
  // ============================================================

  /**
   * Create a new project-scoped API token.
   * The raw token is returned ONLY ONCE.
   */
  async createApiToken(
    projectId: string,
    input: { name: string; permissions?: string[]; expiresInDays?: number | null },
    userId: string,
  ) {
    logger.project.info('createApiToken', { projectId, name: input.name });
    const project = await projectRepository.findById(projectId);
    if (!project) {
      logger.project.warn('createApiToken: project not found', { projectId });
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspaceId) {
      const role = await workspaceRepository.getMemberRole(project.workspaceId, userId);
      if (!role) {
        logger.project.warn('createApiToken: user is not a workspace member', { projectId, userId });
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectApiTokenService.create(projectId, input, userId);
    logger.project.info('createApiToken completed', { projectId });
    return result;
  },

  async listApiTokens(projectId: string, userId: string, params?: { page?: number; perPage?: number }) {
    logger.project.info('listApiTokens', { projectId });
    const project = await projectRepository.findById(projectId);
    if (!project) {
      logger.project.warn('listApiTokens: project not found', { projectId });
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspaceId) {
      const role = await workspaceRepository.getMemberRole(project.workspaceId, userId);
      if (!role) {
        logger.project.warn('listApiTokens: user is not a workspace member', { projectId, userId });
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectApiTokenService.list(projectId, params);
    logger.project.info('listApiTokens completed', { projectId, total: result.total });
    return result;
  },

  async revokeApiToken(projectId: string, tokenId: string, userId: string) {
    logger.project.info('revokeApiToken', { projectId, tokenId });
    const result = await projectApiTokenService.revoke(projectId, tokenId, userId);
    logger.project.info('revokeApiToken completed', { projectId, tokenId });
    return result;
  },
};
