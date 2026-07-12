import { randomBytes } from 'crypto';

import { ROUTES } from '@/commons/constants/routes';
import type { InvitationListQuery, InviteMemberInput } from '@/commons/schemas/invitation.schema';
import type { InvitationListItem, PendingInvitationWithEmail } from '@/commons/types/invitation';
import { db } from '@/server/db/client';
import { env } from '@/server/env';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { AUTH } from '@/server/modules/auth/constants';
import { MAIL } from '@/server/modules/mail/constants';
import { sendMail } from '@/server/modules/mail/mail.service';
import { workspaceInviteTemplate } from '@/server/modules/mail/templates';
import { memberRepository } from '@/server/modules/members/repositories/member.repository';
import type { Paginated } from '@/server/modules/shared/contracts';
import type { WorkspaceInvitation } from '@drizzle/schema/auth';

import { INVITATION } from '../constants';
import { invitationRepository } from '../repositories/invitation.repository';

import { assertCanManageInvitations } from './invitation.validators';

interface IInvitationService {
  list(workspaceId: string, params?: InvitationListQuery): Promise<Paginated<InvitationListItem>>;
  invite(workspaceId: string, data: InviteMemberInput, actorUserId: string): Promise<WorkspaceInvitation>;
  revoke(workspaceId: string, invitationId: string, actorUserId: string): Promise<void>;
  listPending(email: string): Promise<PendingInvitationWithEmail[]>;
  accept(invitationId: string, userId: string): Promise<{ workspaceId: string; role: string }>;
}

export const invitationService: IInvitationService = {
  /**
   * List pending invitations for a workspace.
   * Owner or manager can view.
   */
  async list(workspaceId: string, params?: InvitationListQuery) {
    logger.invitation.info('list', { workspaceId });
    const result = await invitationRepository.list(workspaceId, params);
    logger.invitation.info('list completed', { count: result.data.length });
    return result;
  },

  /**
   * Send a workspace invitation to a user by email.
   * Creates an invitation record with a unique token and expiry.
   *
   * @returns Created invitation record
   */
  async invite(workspaceId: string, data: InviteMemberInput, actorUserId: string) {
    logger.invitation.info('invite', { workspaceId, email: data.email });

    const actorRole = await memberRepository.getMemberRole(workspaceId, actorUserId);
    assertCanManageInvitations(actorRole);

    // Prevent inviting existing workspace members
    const isMember = await invitationRepository.isEmailWorkspaceMember(workspaceId, data.email);
    if (isMember) {
      logger.invitation.warn('inviteMember: user is already a member', { workspaceId, email: data.email });
      throw new AppError(INVITATION.ERRORS.ALREADY_MEMBER, 409, INVITATION.ERROR_CODE);
    }

    const token = randomBytes(INVITATION.INVITE_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH.INVITE_EXPIRY_MS);

    // Atomic: revoke existing pending invitation + create new one
    const result = await db.transaction(async (tx) => {
      const existingInvitation = await invitationRepository.findPending(workspaceId, data.email);
      if (existingInvitation) {
        logger.invitation.info('inviteMember: revoking previous pending invitation', {
          workspaceId,
          email: data.email,
          existingInvitationId: existingInvitation.id,
        });
        await invitationRepository.revoke(workspaceId, existingInvitation.id, tx);
      }

      return invitationRepository.create(workspaceId, {
        email: data.email,
        role: data.role,
        invitedBy: actorUserId,
        token,
        expiresAt,
      }, actorUserId, tx);
    });

    // Send invitation email
    try {
      const workspace = await invitationRepository.findWorkspaceById(workspaceId);
      const workspaceName = workspace?.name ?? 'workspace';
      const acceptUrl = new URL(ROUTES.AUTH.INVITE, env.APP_URL);
      acceptUrl.searchParams.set('token', token);
      await sendMail({
        to: data.email,
        subject: MAIL.SUBJECTS.WORKSPACE_INVITE,
        html: workspaceInviteTemplate(data.email, data.role, workspaceName, acceptUrl.toString()),
      });
      logger.invitation.info('inviteMember email sent', { email: data.email });
    } catch (mailErr) {
      logger.invitation.error('inviteMember email failed', {
        error: mailErr instanceof Error ? mailErr.message : mailErr,
      });
    }

    logger.invitation.info('inviteMember completed', { workspaceId, email: data.email });
    return result;
  },

  /**
   * Revoke a pending invitation.
   * Only owner or manager can revoke.
   * Verifies the invitation belongs to the specified workspace.
   *
   * @throws {AppError} 403 - Insufficient role
   * @throws {AppError} 404 - Invitation not found or belongs to different workspace
   */
  async revoke(workspaceId: string, invitationId: string, actorUserId: string) {
    logger.invitation.info('revoke', { workspaceId, invitationId });

    const actorRole = await memberRepository.getMemberRole(workspaceId, actorUserId);
    assertCanManageInvitations(actorRole);

    const invitation = await invitationRepository.find(invitationId);
    if (!invitation || invitation.workspaceId !== workspaceId) {
      logger.invitation.warn('revoke: invitation not found or not in workspace', { workspaceId, invitationId });
      throw new AppError(INVITATION.ERRORS.INVITATION_NOT_FOUND, 404, INVITATION.ERROR_CODE);
    }

    await invitationRepository.revoke(workspaceId, invitationId);
    logger.invitation.info('revoke completed', { workspaceId, invitationId });
  },

  // ─── User-facing operations ────────────────────────────────────────────────

  async listPending(email: string) {
    logger.invitation.info('listPending', { email });
    const result = await invitationRepository.listPendingInvitationsByEmail(email);
    logger.invitation.info('listPending completed', { count: result.length });
    return result;
  },

  async accept(invitationId: string, userId: string) {
    logger.invitation.info('accept', { invitationId, userId });
    const result = await db.transaction(async (tx) => {
      return invitationRepository.acceptInvitation(invitationId, userId, tx);
    });
    if (!result) {
      logger.invitation.warn('accept: invitation not found', { invitationId });
      throw new AppError(INVITATION.ERRORS.INVITATION_NOT_FOUND, 404, INVITATION.ERROR_CODE);
    }
    logger.invitation.info('accept completed', { invitationId, workspaceId: result.workspaceId });
    return result;
  },
};
