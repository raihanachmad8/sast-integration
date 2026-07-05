import { and, eq, isNull, count } from 'drizzle-orm';

import type { MemberListQuery } from '@/commons/schemas/member.schema';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildFilters, buildSort, buildPaginationMeta } from '@/server/lib/query';
import type { Paginated } from '@/server/modules/shared/contracts';
import { workspaces, workspaceMembers } from '@drizzle/schema';
import { users } from '@drizzle/schema/users';

export type MemberView = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: Date;
};

export type MemberRoleUpdateResult = { userId: string; role: string } | null;

export interface MemberRepository {
  getMemberRole(workspaceId: string, userId: string, tx?: Tx): Promise<string | null>;
  list(workspaceId: string, params?: MemberListQuery, tx?: Tx): Promise<Paginated<MemberView>>;
  updateMemberRole(workspaceId: string, userId: string, role: string, tx?: Tx): Promise<MemberRoleUpdateResult>;
  remove(workspaceId: string, userId: string, tx?: Tx): Promise<void>;
}

export const memberRepository: MemberRepository = {
  /**
   * Get a user's role in a workspace.
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID
   * @returns Role string (owner|manager|reviewer|member) or null if not a member
   */
  async getMemberRole(workspaceId: string, userId: string, tx?: Tx) {
    logger.member.info('getMemberRole', { workspaceId, userId });
    const exec = tx ?? db;
    const [member] = await exec
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
      .limit(1);
    const role = member?.role ?? null;
    if (!role) {
      logger.member.warn('getMemberRole: member not found', { workspaceId, userId });
    }
    logger.member.info('getMemberRole completed', { workspaceId, userId, role });
    return role;
  },

  /**
   * List members with DB-level search, filter, sort, and pagination.
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters from Zod (page, perPage, search, sort, order, role)
   * @returns Paginated member list with total, page, perPage, lastPage
   */
  async list(workspaceId: string, params?: MemberListQuery, tx?: Tx) {
    logger.member.info('list', { workspaceId, page: params?.page });
    const exec = tx ?? db;
    const conditions = [eq(workspaceMembers.workspaceId, workspaceId), isNull(users.deletedAt)];

    // Search (reusable)
    conditions.push(...buildSearch(params?.search, users.name, users.email));

    // Filters (reusable)
    conditions.push(...buildFilters(
      { role: params?.role },
      { role: workspaceMembers.role },
    ));

    // Count total
    const [{ total }] = await exec
      .select({ total: count() })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(and(...conditions));

    // Sort (reusable)
    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: users.name, email: users.email, role: workspaceMembers.role, joinedAt: workspaceMembers.joinedAt },
      workspaceMembers.joinedAt,
    );

    // Paginate
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;

    const data = await exec
      .select({
        userId: workspaceMembers.userId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.member.info('list completed', { workspaceId, count: data.length });
    return { data, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * Update a member's role in a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID
   * @param role - New role to assign
   * @returns Updated member record, or null if not found
   */
  async updateMemberRole(workspaceId: string, userId: string, role: string, tx?: Tx) {
    logger.member.info('updateMemberRole', { workspaceId, userId, role });
    const exec = tx ?? db;
    const [updated] = await exec
      .update(workspaceMembers)
      .set({ role: role as 'owner' | 'manager' | 'reviewer' | 'member' })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
      });
    logger.member.info('updateMemberRole completed', { workspaceId, userId, role });
    return updated ?? null;
  },

  /**
   * Remove a member from a workspace.
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID
   */
  async remove(workspaceId: string, userId: string, tx?: Tx) {
    logger.member.info('remove', { workspaceId, userId });
    const exec = tx ?? db;
    await exec
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    logger.member.info('remove completed', { workspaceId, userId });
  },
};