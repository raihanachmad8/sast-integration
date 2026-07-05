import { PERMISSION } from '@/commons/constants/permissions';
import type { TeamFormInput as CreateTeamInput, TeamUpdateInput as UpdateTeamInput, TeamListQuery } from '@/commons/schemas';
import { generateSlug } from '@/commons/utils/slug';
import { db } from '@/server/db/client';
import { assertHasPermission } from '@/server/http/authorization';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { IEntityService, Paginated } from '@/server/modules/shared/contracts';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import type { Team, TeamMember } from '@drizzle/schema/teams';

import { TEAM } from '../constants';
import { teamRepository } from '../repositories/team.repository';
import type { TeamWithMembers, TeamWithSummary } from '../repositories/team.repository';

/**
 * Team service following the established workspace module patterns.
 * Teams are strictly scoped to a workspace.
 */
interface TeamService extends IEntityService<Team, CreateTeamInput, UpdateTeamInput, TeamListQuery> {
  list(workspaceId: string, userId: string, params?: TeamListQuery): Promise<Paginated<TeamWithSummary>>;
  getById(workspaceId: string, teamId: string, userId: string): Promise<TeamWithMembers>;
  addMember(workspaceId: string, teamId: string, memberUserId: string, userId: string): Promise<TeamMember>;
  removeMember(workspaceId: string, teamId: string, memberUserId: string, userId: string): Promise<void>;
}

export const teamService: TeamService = {
  /**
   * List teams belonging to a workspace with DB-level search, sort, and pagination.
   * Results are enriched with member counts and project associations.
   *
   * @param workspaceId - Workspace UUID to scope the query
   * @param userId - User UUID requesting the list
   * @param params - Query parameters (search, sort, pagination)
   * @returns Paginated team list with summaries
   * @throws {AppError} 403 - User is not a member of the workspace
   */
  async list(workspaceId: string, userId: string, params?: TeamListQuery) {
    logger.team.info('list', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      logger.team.error('list: user is not a workspace member', { workspaceId, userId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const result = await teamRepository.listPaginatedWithSummaries(workspaceId, params);
    logger.team.info('list completed', { count: result.data.length });
    return result as Paginated<TeamWithSummary>;
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
      logger.team.error('getById: user is not a workspace member', { workspaceId, userId, teamId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      logger.team.error('getById: team not found or not in workspace', { teamId, workspaceId });
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    // Include members in detail response
    const members = await teamRepository.listMembers(teamId);

    logger.team.info('getById completed', { teamId });
    return { ...team, members };
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
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    assertHasPermission(actorRole, PERMISSION.TEAM_MANAGE, TEAM.ERROR_CODE);

    if (input.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        logger.team.error('create: slug already exists', { workspaceId, slug: input.slug });
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    if (input.memberIds && input.memberIds.length === 0) {
      logger.team.warn('create: empty memberIds provided, skipping member assignment', { workspaceId });
    }

    const team = await db.transaction(async (tx) => {
      const created = await teamRepository.create(
        workspaceId,
        {
          name: input.name,
          slug: input.slug || generateSlug(input.name, TEAM.MAX_SLUG_LENGTH),
          description: input.description,
        },
        userId,
        tx,
      );

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
      logger.team.error('update: user is not a workspace member', { workspaceId, userId, teamId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    assertHasPermission(role, PERMISSION.TEAM_MANAGE, TEAM.ERROR_CODE);

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      logger.team.error('update: team not found or not in workspace', { teamId, workspaceId });
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    if (input.slug && input.slug !== team.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
        logger.team.error('update: slug already exists', { workspaceId, slug: input.slug });
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    const memberIds = input.memberIds;
    if (memberIds !== undefined && memberIds.length > 0) {
      await assertWorkspaceMemberIds(workspaceId, memberIds);
    }

    const updated = await db.transaction(async (tx) => {
      const teamRecord = await teamRepository.update(
        teamId,
        {
          name: input.name,
          slug: input.slug,
          description: input.description,
        },
        userId,
        tx,
      );

      if (memberIds !== undefined) {
        if (memberIds.length === 0) {
          logger.team.warn('update: empty memberIds provided, clearing team members', { teamId });
        }
        await teamRepository.setMembers(teamId, dedupeIds(memberIds), tx);
      }

      return teamRecord;
    });

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
      logger.team.error('softDelete: user is not a workspace member', { workspaceId, userId, teamId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    assertHasPermission(role, PERMISSION.TEAM_MANAGE, TEAM.ERROR_CODE);

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      logger.team.error('softDelete: team not found or not in workspace', { teamId, workspaceId });
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    const result = await teamRepository.softDelete(teamId, userId);
    logger.team.info('softDelete completed', { teamId });
    return result;
  },

  /**
   * Add a member to a team.
   */
  async addMember(workspaceId: string, teamId: string, memberUserId: string, userId: string) {
    logger.team.info('addMember', { workspaceId, teamId, memberUserId });
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!actorRole) {
      logger.team.error('addMember: user is not a workspace member', { workspaceId, userId, teamId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    assertHasPermission(actorRole, PERMISSION.TEAM_MANAGE, TEAM.ERROR_CODE);

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      logger.team.error('addMember: team not found or not in workspace', { teamId, workspaceId });
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    await assertWorkspaceMemberIds(workspaceId, [memberUserId]);
    const result = await teamRepository.addMember(teamId, memberUserId);
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
      logger.team.error('removeMember: user is not a workspace member', { workspaceId, userId, teamId });
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    assertHasPermission(actorRole, PERMISSION.TEAM_MANAGE, TEAM.ERROR_CODE);

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      logger.team.error('removeMember: team not found or not in workspace', { teamId, workspaceId });
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    await teamRepository.removeMember(teamId, memberUserId);
    logger.team.info('removeMember completed', { teamId, memberUserId });
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
    logger.team.error('assertWorkspaceMemberIds: some members do not belong to workspace', { workspaceId, userIds: uniqueIds });
    throw new AppError('Team members must belong to this workspace', 400, 'TEAM_MEMBER_NOT_IN_WORKSPACE');
  }
}
