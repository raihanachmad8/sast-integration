import { projectRepository } from '../repositories/project.repository';
import { projectApiTokenRepository } from '../repositories/project-api-token.repository';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';

import { AppError } from '@/server/http/errors';
import { PROJECT, MS_PER_DAY, type RepositoryConnectionType } from '../constants';
import type { CreateProjectInput, UpdateProjectInput } from '@/commons/schemas';

/**
 * Project service following the established workspace module patterns.
 * Projects are strictly scoped to a workspace.
 */
export const projectService = {
  /**
   * List all projects belonging to a workspace.
   * Any workspace member can view projects.
   */
  async list(workspaceId: string, userId: string) {
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
    }
    return projectRepository.listByWorkspace(workspaceId);
  },

  /**
   * Get a single project by ID.
   * Verifies user has access to the workspace.
   */
  async getById(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    return project;
  },

  /**
   * Create a new project inside a workspace.
   * Only workspace Owner/Manager can create projects (enforced at route/middleware level).
   */
  async create(input: CreateProjectInput, workspaceId: string, userId: string) {
    // Check for slug conflict within the workspace
    if (input.slug) {
      const existing = await projectRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    return projectRepository.create({
      workspaceId,
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      description: input.description,
      platform: input.platform,
      language: input.language,
      avatarUrl: input.avatar_url,
      createdBy: userId,
    });
  },

  /**
   * Update project metadata.
   * Only project owner or workspace manager+ can update.
   */
  async update(projectId: string, input: UpdateProjectInput, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    if (input.slug && input.slug !== project.slug) {
      const existing = await projectRepository.findBySlug(project.workspace_id!, input.slug);
      if (existing) {
        throw new AppError(PROJECT.ERRORS.SLUG_CONFLICT, 409, PROJECT.ERROR_CODE);
      }
    }

    return projectRepository.update(projectId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      platform: input.platform,
      language: input.language,
      avatarUrl: input.avatar_url,
      updatedBy: userId,
    });
  },

  /**
   * Soft delete a project.
   * Only owner can delete.
   */
  async softDelete(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    return projectRepository.softDelete(projectId, userId);
  },

  /**
   * List repositories attached to this project.
   * Supports both 'scm' and 'external' connection types.
   */
  async listRepositories(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    return projectRepository.listRepositories(projectId);
  },

  /**
   * List all repositories across all projects in a workspace.
   * Returns data shaped for the frontend Repository type.
   */
  async listRepositoriesByWorkspace(workspaceId: string) {
    const rows = await projectRepository.listRepositoriesByWorkspace(workspaceId);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      branch: row.default_branch ?? 'main',
      status: 'active' as const,
      project: row.project_name,
      policyName: null,
      connectionType: row.connection_type as 'scm' | 'external',
      provider: null,
      findings: 0,
      scans: 0,
      lastScan: row.last_synced_at?.toISOString() ?? null,
    }));
  },

  /**
   * Attach or create a repository under this project.
   * Used heavily by the external upload flow.
   */
  /**
   * Attach (or auto-create) a repository under the given project.
   *
   * connectionType must come from REPOSITORY_CONNECTION_TYPES.
   * This method is the primary entry point for the external upload flow
   * (when a CI pipeline uploads results for a repo that does not yet exist).
   */
  async attachRepository(
    projectId: string,
    data: {
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType: RepositoryConnectionType;
      sourceControlId?: string;
      currentPolicyId?: string;
    },
    userId: string
  ) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    return projectRepository.attachRepository(projectId, data, userId);
  },

  /**
   * Set or change the scan policy attached to a specific repository.
   * This enables managed scanning for that repository.
   *
   * When attaching a policy (policyId is not null), it goes through
   * scanPolicyService for full validation (ownership, scanner list, repository type, etc).
   */
  async setRepositoryPolicy(repositoryId: string, policyId: string | null, userId: string, workspaceId?: string) {
    let effectiveWorkspaceId = workspaceId;

    if (policyId) {
      if (!effectiveWorkspaceId) {
        // Auto-resolve workspaceId from the repository
        effectiveWorkspaceId = await projectRepository.getWorkspaceIdByRepositoryId(repositoryId) ?? undefined;
        if (!effectiveWorkspaceId) {
          throw new AppError('Repository not found', 404, 'NOT_FOUND');
        }
      }

      // Full validation through the policy service
      const scanPolicyService = (await import('@/server/modules/scan/services/scan-policy.service')).scanPolicyService;
      await scanPolicyService.preparePolicyAttachment(policyId, repositoryId, effectiveWorkspaceId);
    }

    return projectRepository.setRepositoryPolicy(repositoryId, policyId, userId);
  },

  // ============================================================
  // Project API Token management (for CI uploads - M5 Option A)
  // ============================================================

  /**
   * Create a new project-scoped API token.
   * Only workspace managers/owners (or project owners) should be allowed to call this.
   * The raw token is returned ONLY ONCE.
   */
  async createApiToken(
    projectId: string,
    userId: string,
    input: { name: string; permissions?: string[]; expiresInDays?: number | null }
  ) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
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

    // Never return token_hash to clients
    return {
      token: {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        permissions: token.permissions,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
      rawToken, // IMPORTANT: caller must show this exactly once
    };
  },

  /** List tokens for a project (never returns hashes or raw values) */
  async listApiTokens(projectId: string, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError(PROJECT.ERRORS.NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    if (project.workspace_id) {
      const role = await workspaceRepository.getMemberRole(project.workspace_id, userId);
      if (!role) {
        throw new AppError(PROJECT.ERRORS.NOT_MEMBER, 403, PROJECT.ERROR_CODE);
      }
    }

    const tokens = await projectApiTokenRepository.listByProject(projectId);
    return tokens.map(t => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      permissions: t.permissions,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      revokedAt: t.revokedAt,
    }));
  },

  /** Revoke a project token */
  async revokeApiToken(projectId: string, tokenId: string, userId: string) {
    const token = await projectApiTokenRepository.findById(tokenId);
    if (!token || token.projectId !== projectId) {
      throw new AppError(PROJECT.ERRORS.TOKEN_NOT_FOUND, 404, PROJECT.ERROR_CODE);
    }

    return projectApiTokenRepository.revoke(tokenId, userId);
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
