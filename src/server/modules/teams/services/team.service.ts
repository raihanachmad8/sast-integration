import { teamRepository } from '../repositories/team.repository';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
import { AppError } from '@/server/http/errors';
import { TEAM } from '../constants';
import type { CreateTeamInput, UpdateTeamInput } from '@/commons/schemas';

/**
 * Team service following the established workspace module patterns.
 * Teams are strictly scoped to a workspace.
 */
export const teamService = {
  /**
   * List all teams belonging to a workspace.
   * Any workspace member can view teams.
   *
   * @param workspaceId - The workspace to list teams for.
   * @param userId - The authenticated user ID.
   * @returns Array of teams in the workspace.
   * @throws {AppError} If user is not a workspace member.
   */
  async list(workspaceId: string, userId: string) {
     
    console.info(`[Team] List teams - workspaceId=${workspaceId}`);
     
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
       
      console.error(`[Team] List teams failed - user ${userId} is not a member of workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }
    const enriched = await teamRepository.listByWorkspaceWithSummaries(workspaceId);

     
    console.debug(`[Team] List teams success - workspaceId=${workspaceId}, count=${enriched.length}`);
     
    return enriched;
  },

  /**
   * Get a single team by ID.
   * Verifies user has access to the workspace.
   *
   * @param workspaceId - The workspace the team belongs to.
   * @param teamId - The team ID to retrieve.
   * @param userId - The authenticated user ID.
   * @returns The team record.
   * @throws {AppError} If team not found or user lacks access.
   */
  async getById(workspaceId: string, teamId: string, userId: string) {
     
    console.info(`[Team] Get team by ID - workspaceId=${workspaceId}, teamId=${teamId}`);
     
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
       
      console.error(`[Team] Get team by ID failed - user ${userId} is not a member of workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
       
      console.error(`[Team] Get team by ID failed - team ${teamId} not found in workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

     
    console.debug(`[Team] Get team by ID success - teamId=${teamId}, name=${team.name}`);
     
    return team;
  },

  /**
   * Create a new team inside a workspace.
   * Only workspace Owner/Manager can create teams.
   *
   * @param workspaceId - The workspace to create the team in.
   * @param input - Team creation data.
   * @param userId - The authenticated user ID.
   * @returns The newly created team.
   * @throws {AppError} If slug conflicts or user lacks permissions.
   */
  async create(workspaceId: string, input: CreateTeamInput, userId: string) {
     
    console.info(`[Team] Create team - workspaceId=${workspaceId}, name=${input.name}`);
     
    console.debug(`[Team] Create team detail - ${JSON.stringify({ workspaceId, input, userId })}`);

 

    // Check for slug conflict within the workspace
    if (input.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
         
        console.error(`[Team] Create team failed - slug conflict '${input.slug}' in workspace ${workspaceId}`);
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    const team = await teamRepository.create({
      workspaceId,
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      description: input.description,
      createdBy: userId,
    });
    // Set members if provided
    if (input.memberIds && input.memberIds.length > 0) {
      await assertWorkspaceMemberIds(workspaceId, input.memberIds);
      await teamRepository.setMembers(team.id, dedupeIds(input.memberIds));
    }
     
    console.debug(`[Team] Create team success - teamId=${team.id}, name=${team.name}`);
     
    return team;
  },

  /**
   * Update team metadata.
   * Only workspace managers+ can update.
   *
   * @param workspaceId - The workspace the team belongs to.
   * @param teamId - The team ID to update.
   * @param input - Fields to update (partial).
   * @param userId - The authenticated user ID.
   * @returns The updated team.
   * @throws {AppError} If team not found, slug conflicts, or user lacks access.
   */
  async update(workspaceId: string, teamId: string, input: UpdateTeamInput, userId: string) {
     
    console.info(`[Team] Update team - workspaceId=${workspaceId}, teamId=${teamId}`);
     
    console.debug(`[Team] Update team detail - ${JSON.stringify({ workspaceId, teamId, input, userId })}`);

 

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
       
      console.error(`[Team] Update team failed - user ${userId} is not a member of workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
       
      console.error(`[Team] Update team failed - team ${teamId} not found in workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    if (input.slug && input.slug !== team.slug) {
      const existing = await teamRepository.findBySlug(workspaceId, input.slug);
      if (existing) {
         
        console.error(`[Team] Update team failed - slug conflict '${input.slug}' in workspace ${workspaceId}`);
        throw new AppError(TEAM.ERRORS.SLUG_CONFLICT, 409, TEAM.ERROR_CODE);
      }
    }

    const updated = await teamRepository.update(teamId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      updatedBy: userId,
    });
     
    console.debug(`[Team] Update team success - teamId=${teamId}, name=${updated.name}`);
     
    // Update members if provided
    if (input.memberIds !== undefined) {
       
      console.debug(`[Team] Update members - teamId=${teamId}, count=${input.memberIds.length}`);
       
      await assertWorkspaceMemberIds(workspaceId, input.memberIds);
      await teamRepository.setMembers(teamId, dedupeIds(input.memberIds));
    }
    return updated;
  },

  /**
   * Soft delete a team.
   * Only workspace owner can delete.
   *
   * @param workspaceId - The workspace the team belongs to.
   * @param teamId - The team ID to delete.
   * @param userId - The authenticated user ID.
   * @throws {AppError} If team not found or user lacks access.
   */
  async softDelete(workspaceId: string, teamId: string, userId: string) {
     
    console.info(`[Team] Soft delete team - workspaceId=${workspaceId}, teamId=${teamId}`);

 

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
       
      console.error(`[Team] Soft delete team failed - user ${userId} is not a member of workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
       
      console.error(`[Team] Soft delete team failed - team ${teamId} not found in workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    const deleted = await teamRepository.softDelete(teamId, userId);
     
    console.debug(`[Team] Soft delete team success - teamId=${teamId}`);
     
    return deleted;
  },

  /**
   * List team members with user details.
   *
   * @param workspaceId - The workspace the team belongs to.
   * @param teamId - The team ID.
   * @param userId - The authenticated user ID.
   * @returns Array of team members with user information.
   * @throws {AppError} If team not found or user lacks access.
   */
  async listMembers(workspaceId: string, teamId: string, userId: string) {
     
    console.info(`[Team] List members - workspaceId=${workspaceId}, teamId=${teamId}`);

 

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
       
      console.error(`[Team] List members failed - user ${userId} is not a member of workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
       
      console.error(`[Team] List members failed - team ${teamId} not found in workspace ${workspaceId}`);
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }

    const members = await teamRepository.listMembers(teamId);
     
    console.debug(`[Team] List members success - teamId=${teamId}, count=${members.length}`);
     
    return members;
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

  /**
   * Add a member to a team.
   * @example await teamService.addMember('ws-123', 'team-1', 'user-1', 'contributor', 'admin-id');
   */
  async addMember(workspaceId: string, teamId: string, memberUserId: string, role: 'admin' | 'contributor' = 'contributor', userId: string) {
     
    console.info(`[Team] Add member - teamId=${teamId}, userId=${memberUserId}`);
     
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!actorRole) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }
    await assertWorkspaceMemberIds(workspaceId, [memberUserId]);
    return teamRepository.addMember(teamId, memberUserId, role);
  },

  /**
   * Remove a member from a team.
   * @example await teamService.removeMember('ws-123', 'team-1', 'user-1', 'admin-id');
   */
  async removeMember(workspaceId: string, teamId: string, memberUserId: string, userId: string) {
     
    console.info(`[Team] Remove member - teamId=${teamId}, userId=${memberUserId}`);
     
    const actorRole = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!actorRole) {
      throw new AppError(TEAM.ERRORS.NOT_MEMBER, 403, TEAM.ERROR_CODE);
    }

    const team = await teamRepository.findById(teamId);
    if (!team || team.workspaceId !== workspaceId) {
      throw new AppError(TEAM.ERRORS.NOT_FOUND, 404, TEAM.ERROR_CODE);
    }
    await teamRepository.removeMember(teamId, memberUserId);
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
