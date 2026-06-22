import { db } from '@/server/db/client';
import { teamRepository } from '../repositories/team.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { TEAM } from '../constants';
import { logger } from '@/server/lib/logger';
import type { TeamFormInput as CreateTeamInput, TeamUpdateInput as UpdateTeamInput } from '@/commons/schemas';

/**
 * Team service following the established workspace module patterns.
 * Teams are strictly scoped to a workspace.
 */
export const teamService = {
  /**
   * List all teams belonging to a workspace.
   * Any workspace member can view teams.
   *
   * @param workspaceId - Workspace UUID to scope the query
   * @param userId - User UUID requesting the list
   * @returns Array of teams with member and project summaries
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async list(workspaceId: string, userId: string) {
    logger.team.info('list', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    const result = await teamRepository.listByWorkspaceWithSummaries(workspaceId);
    logger.team.info('list completed', { count: result.length });
    return result;
  },

  /**
   * Get a single team by ID.
   *
   * @param workspaceId - Workspace UUID for scope validation
   * @param teamId - Team UUID
   * @param userId - User UUID requesting the team
   * @returns Team record
   * @throws {AppError} 403 - User is not a member of the workspace
   * @throws {AppError} 404 - Team not found or not in this workspace
   */
  async getById(workspaceId: string, teamId: string, userId: string) {
    logger.team.info('getById', { workspaceId, teamId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    logger.team.info('getById completed', { teamId });
    return team;
  },

  /**
   * Create a new team inside a workspace.
   * Only workspace Owner/Manager can create teams.
   *
   * @param workspaceId - Workspace UUID to create the team in
   * @param input - Team creation data (name, slug, description, memberIds)
   * @param userId - User UUID of the creator
   * @returns Created team record
   * @throws {AppError} 409 - Slug already exists in this workspace
   * @throws {AppError} 400 - Team members must belong to this workspace
   */
  async create(workspaceId: string, input: CreateTeamInput, userId: string) {
    logger.team.info('create', { workspaceId, name: input.name });
    if (input.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    const team = await db.transaction(async (tx) => {
      const created = await teamRepository.create({
        workspaceId,
        name: input.name,
        slug: input.slug || this.generateSlug(input.name),
        description: input.description,
        createdBy: userId,
      }, tx);

      if (input.memberIds && input.memberIds.length > 0) {
        await assertWorkspaceMemberIds(workspaceId, input.memberIds);
        await teamRepository.setMembers(created.id, dedupeIds(input.memberIds), tx);
      }

      return created;
    });

    logger.team.info('create completed', { teamId: team.id });
    return team;
  },

  /**
   * Update team metadata.
   */
  async update(workspaceId: string, teamId: string, input: UpdateTeamInput, userId: string) {
    logger.team.info('update', { workspaceId, teamId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    if (input.slug && input.slug !== team.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    const updated = await teamRepository.update(teamId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      updatedBy: userId,
    });

    if (input.memberIds !== undefined) {
      await assertWorkspaceMemberIds(workspaceId, input.memberIds);
      await teamRepository.setMembers(teamId, dedupeIds(input.memberIds));
    }

    logger.team.info('update completed', { teamId });
    return updated;
  },

  /**
   * Soft delete a team.
   */
  async softDelete(workspaceId: string, teamId: string, userId: string) {
    logger.team.info('softDelete', { workspaceId, teamId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    const result = await teamRepository.softDelete(teamId, userId);
    logger.team.info('softDelete completed', { teamId });
    return result;
  },

  /**
   * List team members with user details.
   */
  async listMembers(workspaceId: string, teamId: string, userId: string) {
    logger.team.info('listMembers', { workspaceId, teamId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    const result = await teamRepository.listMembers(teamId);
    logger.team.info('listMembers completed', { count: result.length });
    return result;
  },

  /**
   * Add a member to a team.
   */
  async addMember(workspaceId: string, teamId: string, memberUserId: string, role: 'admin' | 'contributor' = 'contributor', userId: string) {
    logger.team.info('addMember', { workspaceId, teamId, memberUserId });
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!actorRole) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    await assertWorkspaceMemberIds(workspaceId, [memberUserId]);
    const result = await teamRepository.addMember(teamId, memberUserId, role);
    logger.team.info('addMember completed', { teamId, memberUserId });
    return result;
  },

  /**
   * Remove a member from a team.
   */
  async removeMember(workspaceId: string, teamId: string, memberUserId: string, userId: string) {
    logger.team.info('removeMember', { workspaceId, teamId, memberUserId });
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!actorRole) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    await teamRepository.removeMember(teamId, memberUserId);
    logger.team.info('removeMember completed', { teamId, memberUserId });
  },

  // Internal helper
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, TEAM.MAX_SLUG_LENGTH);
  },
};

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

async function assertWorkspaceMemberIds(workspaceId: string, userIds: string[]) {
  const uniqueIds = dedupeIds(userIds);
  if (uniqueIds.length === 0) return;

  const validIds = await workspaceRepository.findMemberUserIds(workspaceId, uniqueIds);
  if (validIds.length !== uniqueIds.length) {
    throw new AppError('Team members must belong to this workspace', 400, 'TEAM_MEMBER_NOT_IN_WORKSPACE');
  }
}
