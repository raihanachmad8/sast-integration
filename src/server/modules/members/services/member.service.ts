import { ROLE } from '@/commons/constants/permissions';
import type { MemberListQuery } from '@/commons/schemas/member.schema';
import { db } from '@/server/db/client';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { Paginated } from '@/server/modules/shared/contracts';

import { MEMBER } from '../constants';
import { memberRepository } from '../repositories/member.repository';
import type { MemberRoleUpdateResult, MemberView } from '../repositories/member.repository';

import {
  assertCanChangeRole,
  assertCanRemoveMember,
  assertNotAssigningOwner,
  assertNotSelf,
  assertValidRole,
} from './member.validators';

interface MemberService {
  list(workspaceId: string, params?: MemberListQuery): Promise<Paginated<MemberView>>;
  changeRole(workspaceId: string, targetUserId: string, newRole: string, actorUserId: string): Promise<MemberRoleUpdateResult>;
  remove(workspaceId: string, targetUserId: string, actorUserId: string): Promise<void>;
}

export const memberService: MemberService = {
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
    assertNotSelf(targetUserId, actorUserId, 'changeRole');
    assertNotAssigningOwner(newRole);

    return db.transaction(async (tx) => {
      const [actorRole, targetRole] = await Promise.all([
        memberRepository.getMemberRole(workspaceId, actorUserId, tx),
        memberRepository.getMemberRole(workspaceId, targetUserId, tx),
      ]);

      assertCanChangeRole(actorRole, targetRole, newRole);

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
    assertNotSelf(targetUserId, actorUserId, 'remove');

    return db.transaction(async (tx) => {
      const [actorRole, targetRole] = await Promise.all([
        memberRepository.getMemberRole(workspaceId, actorUserId, tx),
        memberRepository.getMemberRole(workspaceId, targetUserId, tx),
      ]);

      assertCanRemoveMember(actorRole, targetRole);

      if (targetRole === ROLE.MANAGER) {
        const membersResult = await memberRepository.list(workspaceId);
        const managerCount = membersResult.data.filter((m) => m.role === ROLE.MANAGER).length;
        if (managerCount <= 1) {
          throw new AppError('Cannot remove the last manager from workspace', 403, MEMBER.ERROR_CODE);
        }
      }

      await memberRepository.remove(workspaceId, targetUserId, tx);
      logger.member.info('remove completed', { workspaceId, targetUserId });
    });
  },
};
