import { randomBytes } from 'crypto';
import { workspaceRepository } from '../repositories/workspace.repository';
import { WORKSPACE } from '../constants';
import { ROLE } from '@/commons/constants/permissions';
import { ROUTES } from '@/commons/constants/routes';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { sendMail } from '@/server/modules/mail/mail.service';
import { workspaceInviteTemplate } from '@/server/modules/mail/templates';
import { MAIL } from '@/server/modules/mail/constants';
import { env } from '@/server/env';
import { logger } from '@/server/lib/logger';

type Role = typeof ROLE[keyof typeof ROLE];

const INVITE_TOKEN_BYTES = 32;

export const memberService = {
  /**
   * List all members of a workspace with user details.
   * Any workspace member can call this.
   */
  async listMembers(workspaceId: string) {
    logger.member.info('listMembers', { workspaceId });
    const result = await workspaceRepository.listMembers(workspaceId);
    logger.member.info('listMembers completed', { count: result.length });
    return result;
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
    logger.member.info('changeRole', { workspaceId, targetUserId, newRole });
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

    const result = await workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole);
    logger.member.info('changeRole completed', { workspaceId, targetUserId });
    return result;
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
    logger.member.info('removeMember', { workspaceId, targetUserId });
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
    logger.member.info('removeMember completed', { workspaceId, targetUserId });
  },

  /**
   * List pending invitations for a workspace.
   * Owner or manager can view.
   */
  async listInvitations(workspaceId: string) {
    logger.member.info('listInvitations', { workspaceId });
    const result = await workspaceRepository.listInvitations(workspaceId);
    logger.member.info('listInvitations completed', { count: result.length });
    return result;
  },

  /**
   * Send a workspace invitation to a user by email.
   * Creates an invitation record with a unique token and expiry.
   *
   * @returns Created invitation record
   */
  async inviteMember(workspaceId: string, data: { email: string; role: Role }, actorUserId: string) {
    logger.member.info('inviteMember', { workspaceId, email: data.email });
    const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH.INVITE_EXPIRY_MS);
    const result = await workspaceRepository.createInvitation({
      email: data.email,
      role: data.role,
      workspaceId,
      invitedBy: actorUserId,
      token,
      expiresAt,
    });

    // Send invitation email
    try {
      const workspace = await workspaceRepository.findById(workspaceId);
      const workspaceName = workspace?.name ?? 'workspace';
      const acceptUrl = new URL(ROUTES.AUTH.INVITE, env.APP_URL);
      acceptUrl.searchParams.set('token', token);
      await sendMail({
        to: data.email,
        subject: MAIL.SUBJECTS.WORKSPACE_INVITE,
        html: workspaceInviteTemplate(data.email, data.role, workspaceName, acceptUrl.toString()),
      });
      logger.member.info('inviteMember email sent', { email: data.email });
    } catch (mailErr) {
      logger.member.error('inviteMember email failed', { error: mailErr instanceof Error ? mailErr.message : mailErr });
    }

    logger.member.info('inviteMember completed', { workspaceId, email: data.email });
    return result;
  },

  /**
   * Revoke a pending invitation.
   * Verifies the invitation belongs to the specified workspace.
   *
   * @throws {AppError} 404 - Invitation not found or belongs to different workspace
   */
  async revokeInvitation(workspaceId: string, invitationId: string) {
    logger.member.info('revokeInvitation', { workspaceId, invitationId });
    const invitation = await workspaceRepository.findInvitation(invitationId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new AppError(WORKSPACE.ERRORS.INVITATION_NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    }

    await workspaceRepository.revokeInvitation(invitationId);
    logger.member.info('revokeInvitation completed', { invitationId });
  },
};
