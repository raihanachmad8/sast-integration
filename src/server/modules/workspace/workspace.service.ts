import { randomUUID } from 'crypto';
import { db } from '@/server/db/client';
import { ROLE } from '@/commons/constants/permissions';
import { workspaceRepository } from './repositories/workspace.repository';
import { WORKSPACE } from './constants';
import { WORKSPACE_MODE, WORKSPACE_DEFAULTS } from '@/server/modules/auth/constants';
import { env } from '@/server/env';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { WorkspaceCreateInput as CreateWorkspaceInput, WorkspaceUpdateInput as UpdateWorkspaceInput } from '@/commons/schemas';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextPersonalSlug(userId: string, tx: Tx) {
  const baseSlug = `${WORKSPACE_DEFAULTS.PERSONAL_SLUG_PREFIX}${userId.slice(0, 8)}`;
  const existingBase = await workspaceRepository.findBySlug(baseSlug, tx);
  if (!existingBase) return baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
    const existing = await workspaceRepository.findBySlug(slug, tx);
    if (!existing) return slug;
  }

  throw new AppError(WORKSPACE.ERRORS.SLUG_CONFLICT, 409, WORKSPACE.ERROR_CODE);
}

export const workspaceService = {
  /**
   * List all workspaces the user belongs to.
   * @param userId - Authenticated user ID
   */
  async list(userId: string) {
    logger.workspace.info('list', { userId });
    const result = await workspaceRepository.listByUser(userId);
    logger.workspace.info('list completed', { count: result.length });
    return result;
  },

  /**
   * Get workspace details. Verifies user is a member.
   * @param workspaceId - Workspace UUID
   * @param userId - Authenticated user ID
   */
  async getById(workspaceId: string, userId: string) {
    logger.workspace.info('getById', { workspaceId, userId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError(WORKSPACE.ERRORS.NOT_MEMBER, 403, WORKSPACE.ERROR_CODE);

    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw new AppError(WORKSPACE.ERRORS.NOT_FOUND, 404, WORKSPACE.ERROR_CODE);

    logger.workspace.info('getById completed', { workspaceId });
    return { ...ws, role };
  },

  /**
   * Create a personal workspace only when the user has no active personal workspace.
   * Organization workspaces remain invitation-only.
   * @param input - Name, optional slug/description
   * @param userId - Creator user ID
   */
  async create(input: CreateWorkspaceInput, userId: string) {
    logger.workspace.info('create', { userId, type: input.type });
    if (env.WORKSPACE_MODE === WORKSPACE_MODE.SINGLE) {
      throw new AppError(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED, 403, WORKSPACE.ERROR_CODE);
    }

    if (input.type !== WORKSPACE.TYPE.PERSONAL) {
      throw new AppError(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED, 403, WORKSPACE.ERROR_CODE);
    }

    const existingPersonal = await workspaceRepository.findActivePersonalByOwner(userId);
    if (existingPersonal) {
      throw new AppError(WORKSPACE.ERRORS.PERSONAL_EXISTS, 409, WORKSPACE.ERROR_CODE);
    }

    const result = await db.transaction(async (tx) => {
      const slug = await nextPersonalSlug(userId, tx);
      const ws = await workspaceRepository.create({
        name: WORKSPACE_DEFAULTS.PERSONAL_NAME,
        slug,
        type: WORKSPACE.TYPE.PERSONAL,
        createdBy: userId,
      }, tx);
      await workspaceRepository.addMember(ws.id, userId, ROLE.OWNER, tx);
      await workspaceRepository.switchWorkspace(userId, ws.id, tx);
      return ws;
    });
    logger.workspace.info('create completed', { workspaceId: result.id });
    return result;
  },

  /**
   * Update workspace. Only owner can update.
   * @param workspaceId - Workspace UUID
   * @param input - Fields to update
   * @param userId - Authenticated user ID
   */
  async update(workspaceId: string, input: UpdateWorkspaceInput, userId: string) {
    logger.workspace.info('update', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (role !== ROLE.OWNER) throw new AppError(WORKSPACE.ERRORS.NOT_OWNER, 403, WORKSPACE.ERROR_CODE);

    if (input.slug) {
      const existing = await workspaceRepository.findBySlug(input.slug);
      if (existing && existing.id !== workspaceId) throw new AppError(WORKSPACE.ERRORS.SLUG_CONFLICT, 409, WORKSPACE.ERROR_CODE);
    }

    const result = await workspaceRepository.update(workspaceId, { ...input, updatedBy: userId });
    logger.workspace.info('update completed', { workspaceId });
    return result;
  },

  /**
   * Delete workspace. Only owner can delete. Personal workspace cannot be deleted.
   * @param workspaceId - Workspace UUID
   * @param userId - Authenticated user ID
   */
  async delete(workspaceId: string, userId: string) {
    logger.workspace.info('delete', { workspaceId, userId });
    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw new AppError(WORKSPACE.ERRORS.NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    if (ws.type === WORKSPACE.TYPE.PERSONAL) throw new AppError(WORKSPACE.ERRORS.CANNOT_DELETE_PERSONAL, 403, WORKSPACE.ERROR_CODE);

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (role !== ROLE.OWNER) throw new AppError(WORKSPACE.ERRORS.NOT_OWNER, 403, WORKSPACE.ERROR_CODE);

    await workspaceRepository.delete(workspaceId, userId);
    logger.workspace.info('delete completed', { workspaceId });
  },

  /**
   * Switch user's active workspace. Verifies membership.
   * @param workspaceId - Target workspace UUID
   * @param userId - Authenticated user ID
   */
  async switchWorkspace(workspaceId: string, userId: string) {
    logger.workspace.info('switchWorkspace', { workspaceId, userId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError(WORKSPACE.ERRORS.NOT_MEMBER, 403, WORKSPACE.ERROR_CODE);

    await workspaceRepository.switchWorkspace(userId, workspaceId);
    logger.workspace.info('switchWorkspace completed', { workspaceId, userId });
  },

  /**
   * List all pending invitations for a user by email.
   * @param email - User's email address
   */
  async listPendingInvitations(email: string) {
    logger.workspace.info('listPendingInvitations', { email });
    const result = await workspaceRepository.listPendingInvitationsByEmail(email);
    logger.workspace.info('listPendingInvitations completed', { count: result.length });
    return result;
  },

  /**
   * Accept a pending invitation. Adds user to workspace.
   * @param invitationId - Invitation UUID
   * @param userId - Authenticated user ID
   */
  async acceptInvitation(invitationId: string, userId: string) {
    logger.workspace.info('acceptInvitation', { invitationId, userId });
    const result = await workspaceRepository.acceptInvitation(invitationId, userId);
    if (!result) throw new AppError(WORKSPACE.ERRORS.INVITATION_NOT_FOUND, 404, WORKSPACE.ERROR_CODE);
    logger.workspace.info('acceptInvitation completed', { invitationId, workspaceId: result.workspaceId });
    return result;
  },

  /**
   * Decline (delete) a pending invitation.
   * @param invitationId - Invitation UUID
   */
  async declineInvitation(invitationId: string) {
    logger.workspace.info('declineInvitation', { invitationId });
    await workspaceRepository.revokeInvitation(invitationId);
    logger.workspace.info('declineInvitation completed', { invitationId });
  },
};
