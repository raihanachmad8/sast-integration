import { workspaceRepository } from './workspace.repository';
import { WORKSPACE } from './constants';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

type Role = typeof ROLE[keyof typeof ROLE];

export const memberService = {
  /**
   * List all members of a workspace with user details.
   * Any workspace member can call this.
   */
  async listMembers(workspaceId: string) {
    return workspaceRepository.listMembers(workspaceId);
  },

  /**
   * Change a member's role.
   * Only the workspace owner can change roles.
   *
   * @throws {AppError} 403 - Cannot change own role
   * @throws {AppError} 403 - Cannot assign owner role
   * @throws {AppError} 403 - Cannot change owner's role
   * @throws {AppError} 404 - Target member not found
   */
  async changeRole(workspaceId: string, targetUserId: string, newRole: Role, actorUserId: string) {
    if (targetUserId === actorUserId) {
      throw new AppError(WORKSPACE.ERRORS.CANNOT_CHANGE_OWN_ROLE, 403, WORKSPACE.ERROR_CODE);
    }
    if (newRole === ROLE.OWNER) {
      throw new AppError(WORKSPACE.ERRORS.CANNOT_ASSIGN_OWNER, 403, WORKSPACE.ERROR_CODE);
    }

    const targetRole = await workspaceRepository.getMemberRole(workspaceId, targetUserId);
    if (!targetRole) {
      throw new AppError(WORKSPACE.ERRORS.MEMBER_NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    }
    if (targetRole === ROLE.OWNER) {
      throw new AppError(WORKSPACE.ERRORS.CANNOT_CHANGE_OWNER_ROLE, 403, WORKSPACE.ERROR_CODE);
    }

    return workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole);
  },

  /**
   * Remove a member from workspace.
   * Owner or manager can remove; cannot remove self or owner.
   *
   * @throws {AppError} 403 - Cannot remove self
   * @throws {AppError} 403 - Cannot remove owner
   * @throws {AppError} 404 - Target member not found
   */
  async removeMember(workspaceId: string, targetUserId: string, actorUserId: string) {
    if (targetUserId === actorUserId) {
      throw new AppError(WORKSPACE.ERRORS.CANNOT_REMOVE_SELF, 403, WORKSPACE.ERROR_CODE);
    }

    const targetRole = await workspaceRepository.getMemberRole(workspaceId, targetUserId);
    if (!targetRole) {
      throw new AppError(WORKSPACE.ERRORS.MEMBER_NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    }
    if (targetRole === ROLE.OWNER) {
      throw new AppError(WORKSPACE.ERRORS.CANNOT_REMOVE_OWNER, 403, WORKSPACE.ERROR_CODE);
    }

    await workspaceRepository.removeMember(workspaceId, targetUserId);
  },

  /**
   * List pending invitations for a workspace.
   * Owner or manager can view.
   */
  async listInvitations(workspaceId: string) {
    return workspaceRepository.listInvitations(workspaceId);
  },

  /**
   * Revoke a pending invitation.
   * Verifies the invitation belongs to the specified workspace.
   *
   * @throws {AppError} 404 - Invitation not found or belongs to different workspace
   */
  async revokeInvitation(workspaceId: string, invitationId: string) {
    const invitation = await workspaceRepository.findInvitation(invitationId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new AppError(WORKSPACE.ERRORS.INVITATION_NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    }

    await workspaceRepository.revokeInvitation(invitationId);
  },
};
