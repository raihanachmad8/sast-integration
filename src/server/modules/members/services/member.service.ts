import { ROLE } from '@/commons/constants/permissions';
import type { MemberListQuery } from '@/commons/schemas/member.schema';
import { db } from '@/server/db/client';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

import { MEMBER } from '../constants';
import { memberRepository } from '../repositories/member.repository';

type Role = typeof ROLE[keyof typeof ROLE];

const VALID_ROLES: readonly string[] = [ROLE.OWNER, ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER];

/**
 * Assert that the given role is a valid role value.
 * Purpose: Fail fast on invalid input before any DB queries.
 */
function assertValidRole(role: string): void {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`, 400, MEMBER.ERROR_CODE);
  }
}

export const memberService = {
  /**
   * List workspace members with filtering, sorting, and pagination.
   *
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters (lenient validation from Zod)
   * @returns Paginated member list
   * @throws {AppError} 403 if requester is not a workspace member
   */
  async list(workspaceId: string, params?: MemberListQuery) {
    logger.member.info('list', { workspaceId });
    const result = await memberRepository.list(workspaceId, params);
    logger.member.info('list completed', { total: result.total });
    return result;
  },

  /**
   * Change a member's role.
   * Only the workspace owner can change roles; managers can assign reviewer or member.
   * Wrapped in a transaction for atomicity of role reads + writes.
   *
   * @throws {AppError} 400 - Invalid role value
   * @throws {AppError} 403 - Cannot change own role
   * @throws {AppError} 403 - Cannot assign owner role
   * @throws {AppError} 403 - Cannot change owner's role
   * @throws {AppError} 403 - Insufficient permissions
   * @throws {AppError} 404 - Target member not found
   */
  async changeRole(workspaceId: string, targetUserId: string, newRole: string, actorUserId: string) {
    logger.member.info('changeRole', { workspaceId, targetUserId, newRole });
    assertValidRole(newRole);

    if (targetUserId === actorUserId) {
      throw new AppError(MEMBER.ERRORS.CANNOT_CHANGE_OWN_ROLE, 403, MEMBER.ERROR_CODE);
    }
    if (newRole === ROLE.OWNER) {
      throw new AppError(MEMBER.ERRORS.CANNOT_ASSIGN_OWNER, 403, MEMBER.ERROR_CODE);
    }

    return db.transaction(async (tx) => {
      const [actorRole, targetRole] = await Promise.all([
        memberRepository.getMemberRole(workspaceId, actorUserId, tx),
        memberRepository.getMemberRole(workspaceId, targetUserId, tx),
      ]);

      if (!actorRole) {
        throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 403, MEMBER.ERROR_CODE);
      }
      if (actorRole !== ROLE.OWNER) {
        if (newRole !== ROLE.REVIEWER && newRole !== ROLE.MEMBER) {
          throw new AppError(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE, 403, MEMBER.ERROR_CODE);
        }
      }

      if (!targetRole) {
        throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 404, MEMBER.ERROR_CODE);
      }
      if (targetRole === ROLE.OWNER) {
        throw new AppError(MEMBER.ERRORS.CANNOT_CHANGE_OWNER_ROLE, 403, MEMBER.ERROR_CODE);
      }
      if (actorRole === ROLE.MANAGER && targetRole === ROLE.MANAGER) {
        throw new AppError(MEMBER.ERRORS.MANAGER_CANNOT_CHANGE_MANAGER, 403, MEMBER.ERROR_CODE);
      }
      if (targetRole === newRole) {
        logger.member.warn('changeRole: target already has the requested role', { workspaceId, targetUserId, role: newRole });
      }

      const result = await memberRepository.updateMemberRole(workspaceId, targetUserId, newRole, tx);
      logger.member.info('changeRole completed', { workspaceId, targetUserId });
      return result;
    });
  },

  /**
   * Remove a member from workspace.
   * Owner or manager can remove; cannot remove self or owner.
   * Wrapped in a transaction for atomicity of role reads + delete.
   *
   * @throws {AppError} 403 - Cannot remove self
   * @throws {AppError} 403 - Cannot remove owner
   * @throws {AppError} 403 - Insufficient permissions
   * @throws {AppError} 404 - Target member not found
   */
  async remove(workspaceId: string, targetUserId: string, actorUserId: string) {
    logger.member.info('remove', { workspaceId, targetUserId });
    if (targetUserId === actorUserId) {
      throw new AppError(MEMBER.ERRORS.CANNOT_REMOVE_SELF, 403, MEMBER.ERROR_CODE);
    }

    return db.transaction(async (tx) => {
      const [actorRole, targetRole] = await Promise.all([
        memberRepository.getMemberRole(workspaceId, actorUserId, tx),
        memberRepository.getMemberRole(workspaceId, targetUserId, tx),
      ]);

      if (!actorRole) {
        throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 403, MEMBER.ERROR_CODE);
      }
      if (!targetRole) {
        throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 404, MEMBER.ERROR_CODE);
      }
      if (targetRole === ROLE.OWNER) {
        throw new AppError(MEMBER.ERRORS.CANNOT_REMOVE_OWNER, 403, MEMBER.ERROR_CODE);
      }
      if (actorRole === ROLE.MANAGER && targetRole === ROLE.MANAGER) {
        throw new AppError(MEMBER.ERRORS.MANAGER_CANNOT_REMOVE_MANAGER, 403, MEMBER.ERROR_CODE);
      }
      if (targetRole === ROLE.MANAGER) {
        const membersResult = await memberRepository.list(workspaceId);
        const managerCount = membersResult.data.filter((m: { role: Role }) => m.role === ROLE.MANAGER).length;
        if (managerCount <= 1) {
          logger.member.warn('remove: removing last manager from workspace', { workspaceId, targetUserId, managerCount });
        }
      }

      await memberRepository.remove(workspaceId, targetUserId);
      logger.member.info('remove completed', { workspaceId, targetUserId });
    });
  },
};
