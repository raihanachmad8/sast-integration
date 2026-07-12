import { PERMISSION } from '@/commons/constants/permissions';
import type { ProjectFormInput as CreateProjectInput, ProjectUpdateInput as UpdateProjectInput, ProjectListQuery } from '@/commons/schemas';
import type { CreateApiTokenInput, ApiTokenListQuery } from '@/commons/schemas/api-token.schema';
import type { AttachRepositoryInput } from '@/commons/schemas/repository.schema';
import type { ProjectMemberSummary, ProjectTeamSummary, ProjectRepositorySummary, ProjectRepositoryListItem, ProjectWithSummary } from '@/commons/types';
import { generateSlug } from '@/commons/utils/slug';
import { db } from '@/server/db/client';
import { assertHasPermission } from '@/server/http/authorization';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { IEntityService } from '@/server/modules/shared/contracts';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import type { Project } from '@drizzle/schema/projects';
import type { Repository } from '@drizzle/schema/source-controls';

import { PROJECT } from '../constants';
import { projectRepository } from '../repositories/project.repository';
import type { UpdateProjectData } from '../repositories/project.repository';

import { projectApiTokenService } from './project-api-token.service';



/**
 * Map a Drizzle project row into the shared ProjectWithSummary shape.
 * Purpose: centralize timestamp conversion and enforce non-null createdAt/updatedAt.
 */
function toProjectWithSummary(
  row: Project,
  summaries: {
    members: ProjectMemberSummary[];
    teams: ProjectTeamSummary[];
    repositories: ProjectRepositorySummary[];
  },
): ProjectWithSummary {
  if (!row.createdAt || !row.updatedAt) {
    throw new Error('Project row is missing required timestamps');
  }
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    ...summaries,
  };
}

/**
 * Project service following the established workspace module patterns.
 * Projects are strictly scoped to a workspace.
 */
interface IProjectService extends IEntityService<ProjectWithSummary, CreateProjectInput, UpdateProjectInput, ProjectListQuery> {
  listMembers(workspaceId: string, projectId: string, userId: string): Promise<ProjectMemberSummary[]>;
  listRepositories(workspaceId: string, projectId: string, userId: string): Promise<Repository[]>;
  listRepositoriesByWorkspace(workspaceId: string, accessibleProjectIds?: string[]): Promise<ProjectRepositoryListItem[]>;
  attachRepository(
    workspaceId: string,
    projectId: string,
    data: AttachRepositoryInput,
    userId: string,
  ): Promise<Repository>;
  createApiToken(
    workspaceId: string,
    projectId: string,
    input: CreateApiTokenInput,
    userId: string,
  ): Promise<Awaited<ReturnType<typeof projectApiTokenService.create>>>;
  listApiTokens(workspaceId: string, projectId: string, userId: string, params?: ApiTokenListQuery): Promise<Awaited<ReturnType<typeof projectApiTokenService.list>>>;
  revokeApiToken(workspaceId: string, projectId: string, tokenId: string, userId: string): Promise<Awaited<ReturnType<typeof projectApiTokenService.revoke>>>;
}

export const projectService: IProjectService = {
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

    const data: ProjectWithSummary[] = rows.map((p) =>
      toProjectWithSummary(p, {
        members: membersMap.get(p.id) ?? [],
        teams: teamsMap.get(p.id) ?? [],
        repositories: repositoriesMap.get(p.id) ?? [],
      }),
    );

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
    return toProjectWithSummary(project, { members, teams, repositories });
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
  async listMembers(workspaceId: string, projectId: string, userId: string) {
    logger.project.info('listMembers', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
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

    const result = await db.transaction(async (tx) => {
      const project = await projectRepository.create(
        {
          workspaceId,
          name: input.name,
          slug: input.slug || generateSlug(input.name, PROJECT.MAX_SLUG_LENGTH),
          description: input.description,
          createdBy: userId,
        },
        tx,
      );

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
    return toProjectWithSummary(result, { members: [], teams: [], repositories: [] });
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

    const updateData: UpdateProjectData = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      lead: input.lead,
    };

    // Always replace all relation arrays (PUT = full replace) in one transaction
    const result = await db.transaction(async (tx) => {
      const project = await projectRepository.update(projectId, updateData, userId, tx);
      await projectRepository.setMembers(projectId, input.memberIds ?? [], tx);
      await projectRepository.setTeams(projectId, input.teamIds ?? [], tx);
      await projectRepository.setRepositories(projectId, input.repositoryIds ?? [], tx);
      return project;
    });

    logger.project.info('update completed', { projectId });
    return toProjectWithSummary(result, { members: [], teams: [], repositories: [] });
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

    await projectRepository.softDelete(projectId, userId);
    logger.project.info('softDelete completed', { projectId });
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
  async listRepositories(workspaceId: string, projectId: string, userId: string) {
    logger.project.info('listRepositories', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
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
    workspaceId: string,
    projectId: string,
    data: AttachRepositoryInput,
    userId: string
  ) {
    logger.project.info('attachRepository', { projectId, name: data.name });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.project.warn('attachRepository not member', { projectId, userId });
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }

    const project = await projectRepository.findById(projectId);
    if (!project) {
      logger.project.warn('attachRepository project not found', { projectId });
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    const result = await projectRepository.attachRepository(projectId, project.workspaceId, data, userId);
    logger.project.info('attachRepository completed', { projectId });
    return result;
  },

  // ============================================================
  // Project API Token management
  // ============================================================

  /**
   * Create a new project-scoped API token.
   * The raw token is returned ONLY ONCE.
   */
  async createApiToken(
    workspaceId: string,
    projectId: string,
    input: CreateApiTokenInput,
    userId: string,
  ) {
    logger.project.info('createApiToken', { projectId, name: input.name });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.project.warn('createApiToken: user is not a workspace member', { projectId, userId });
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }

    const result = await projectApiTokenService.create(projectId, input, userId);
    logger.project.info('createApiToken completed', { projectId });
    return result;
  },

  async listApiTokens(workspaceId: string, projectId: string, userId: string, params?: ApiTokenListQuery) {
    logger.project.info('listApiTokens', { projectId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.project.warn('listApiTokens: user is not a workspace member', { projectId, userId });
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }

    const result = await projectApiTokenService.list(projectId, params);
    logger.project.info('listApiTokens completed', { projectId, total: result.total });
    return result;
  },

  async revokeApiToken(workspaceId: string, projectId: string, tokenId: string, userId: string) {
    logger.project.info('revokeApiToken', { projectId, tokenId });
    const result = await projectApiTokenService.revoke(projectId, tokenId, userId);
    logger.project.info('revokeApiToken completed', { projectId, tokenId });
    return result;
  },
};
