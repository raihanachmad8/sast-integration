import { projectRepository } from '../repositories/project.repository';
import { projectApiTokenRepository } from '../repositories/project-api-token.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { PROJECT, MS_PER_DAY, type RepositoryConnectionType } from '../constants';
import { logger } from '@/server/lib/logger';
import type { ProjectFormInput as CreateProjectInput, ProjectUpdateInput as UpdateProjectInput } from '@/commons/schemas';

/**
 * Project service following the established workspace module patterns.
 * Projects are strictly scoped to a workspace.
 */
export const projectService = {
  /**
   * List all projects belonging to a workspace.
   */
  async list(workspaceId: string, userId: string) {
    logger.project.info('list', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }
    const rows = await projectRepository.listByWorkspace(workspaceId);
    if (rows.length === 0) {
      logger.project.info('list completed', { count: 0 });
      return [];
    }

    const projectIds = rows.map((p) => p.id);
    const [memberIdsMap, teamIdsMap, memberNamesMap, teamNamesMap, repoIdsMap, repoNamesMap] = await Promise.all([
      projectRepository.listMemberIdsByProjectIds(projectIds),
      projectRepository.listTeamIdsByProjectIds(projectIds),
      projectRepository.listMemberNamesByProjectIds(projectIds),
      projectRepository.listTeamNamesByProjectIds(projectIds),
      projectRepository.listRepositoryIdsByProjectIds(projectIds),
      projectRepository.listRepositoryNamesByProjectIds(projectIds),
    ]);

    const result = rows.map((p) => ({
      ...p,
      members: memberIdsMap.get(p.id) ?? [],
      teams: teamIdsMap.get(p.id) ?? [],
      memberNames: memberNamesMap.get(p.id) ?? [],
      teamNames: teamNamesMap.get(p.id) ?? [],
      repositories: repoNamesMap.get(p.id) ?? [],
      automation: [] as string[],
    }));

    logger.project.info('list completed', { count: result.length });
    return result;
  },

  /**
   * Get a single project by ID.
   */
  async getById(projectId: string, userId: string) {
    logger.project.info('getById', { projectId });
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

    const [members, teams, memberNames, teamNames, repositoryNames] = await Promise.all([
      projectRepository.listMemberIds(projectId),
      projectRepository.listTeamIds(projectId),
      projectRepository.listMemberNames(projectId),
      projectRepository.listTeamNames(projectId),
      projectRepository.listRepositoryNames(projectId),
    ]);

    logger.project.info('getById completed', { projectId });
    return { ...project, members, teams, memberNames, teamNames, repositories: repositoryNames, automation: [] as string[] };
  },

  /**
   * Create a new project inside a workspace.
   */
  async create(input: CreateProjectInput, workspaceId: string, userId: string) {
    logger.project.info('create', { workspaceId, name: input.name });
    if (input.slug) {
      const existing = await projectRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectRepository.create({
      workspaceId,
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      description: input.description,
      platform: input.platform,
      language: input.language,
      avatarUrl: input.avatarUrl,
      createdBy: userId,
    });

    if (input.memberIds?.length) {
      await projectRepository.setMembers(result.id, input.memberIds);
    }
    if (input.teamIds?.length) {
      await projectRepository.setTeams(result.id, input.teamIds);
    }

    logger.project.info('create completed', { projectId: result.id });
    return result;
  },

  /**
   * Update project metadata.
   */
  async update(projectId: string, input: UpdateProjectInput, userId: string) {
    logger.project.info('update', { projectId });
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

    if (input.slug && input.slug !== project.slug) {
      const existing = await projectRepository.findBySlug(project.workspaceId!, input.slug);
      if (existing) {
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    const result = await projectRepository.update(projectId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      platform: input.platform,
      language: input.language,
      avatarUrl: input.avatarUrl,
      updatedBy: userId,
    });

    if (input.memberIds) {
      await projectRepository.setMembers(projectId, input.memberIds);
    }
    if (input.teamIds) {
      await projectRepository.setTeams(projectId, input.teamIds);
    }

    logger.project.info('update completed', { projectId });
    return result;
  },

  /**
   * Soft delete a project.
   */
  async softDelete(projectId: string, userId: string) {
    logger.project.info('softDelete', { projectId });
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

    const result = await projectRepository.softDelete(projectId, userId);
    logger.project.info('softDelete completed', { projectId });
    return result;
  },

  /**
   * List repositories attached to this project.
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
  async listRepositoriesByWorkspace(workspaceId: string) {
    logger.project.info('listRepositoriesByWorkspace', { workspaceId });
    const rows = await projectRepository.listRepositoriesByWorkspace(workspaceId);
    const result = rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      branch: row.defaultBranch ?? 'main',
      status: 'active' as const,
      project: row.projectName,
      policyName: null,
      connectionType: row.connectionType as 'scm' | 'external',
      provider: null,
      findings: 0,
      scans: 0,
      lastScan: row.lastSyncedAt?.toISOString() ?? null,
    }));
    logger.project.info('listRepositoriesByWorkspace completed', { count: result.length });
    return result;
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
      connectionType: RepositoryConnectionType;
      sourceControlId?: string;
    },
    userId: string
  ) {
    logger.project.info('attachRepository', { projectId, name: data.name });
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
    projectId: string,
    userId: string,
    input: { name: string; permissions?: string[]; expiresInDays?: number | null }
  ) {
    logger.project.info('createApiToken', { projectId, name: input.name });
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

    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * MS_PER_DAY)
      : null;

    const { token, rawToken } = await projectApiTokenRepository.create({
      projectId,
      createdBy: userId,
      name: input.name,
      permissions: input.permissions,
      expiresAt: expiresAt ?? undefined,
    });

    logger.project.info('createApiToken completed', { projectId, tokenId: token.id });
    return {
      token: {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        permissions: token.permissions,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
      rawToken,
    };
  },

  async listApiTokens(projectId: string, userId: string) {
    logger.project.info('listApiTokens', { projectId });
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

    const tokens = await projectApiTokenRepository.listByProject(projectId);
    const result = tokens.map(t => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      permissions: t.permissions,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      revokedAt: t.revokedAt,
    }));
    logger.project.info('listApiTokens completed', { count: result.length });
    return result;
  },

  async revokeApiToken(projectId: string, tokenId: string, userId: string) {
    logger.project.info('revokeApiToken', { projectId, tokenId });
    const token = await projectApiTokenRepository.findById(tokenId);
    if (!token || token.projectId !== projectId) {
      throw new AppError(PROJECT.ERRORS.TOKEN_NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    const result = await projectApiTokenRepository.revoke(tokenId, userId);
    logger.project.info('revokeApiToken completed', { tokenId });
    return result;
  },

  // Internal helper
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, PROJECT.MAX_SLUG_LENGTH);
  },
};
