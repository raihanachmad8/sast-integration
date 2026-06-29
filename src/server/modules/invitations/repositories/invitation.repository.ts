import { and, eq, gt, isNull, isNotNull, lte, count } from 'drizzle-orm';

import type { InvitationListQuery } from '@/commons/schemas/member.schema';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildFilters, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { workspaceMembers } from '@drizzle/schema';
import { workspaces } from '@drizzle/schema';
import { workspaceInvitations } from '@drizzle/schema/auth';
import { users } from '@drizzle/schema/users';

export const invitationRepository = {
  /**
   * List pending (not accepted, not expired) invitations for a workspace
   * with DB-level filtering, sorting, and pagination.
   */
  async list(workspaceId: string, params?: InvitationListQuery) {
    logger.invitation.info('listInvitations', { workspaceId });
    try {
      const conditions = [
        eq(workspaceInvitations.workspaceId, workspaceId),
        isNull(users.deletedAt),
      ];

      // Status filter — default to 'pending' if not specified
      const status = params?.status ?? 'pending';
      if (status === 'pending') {
        conditions.push(isNull(workspaceInvitations.acceptedAt));
        conditions.push(gt(workspaceInvitations.expiresAt, new Date()));
      } else if (status === 'accepted') {
        conditions.push(isNotNull(workspaceInvitations.acceptedAt));
      } else if (status === 'expired') {
        conditions.push(lte(workspaceInvitations.expiresAt, new Date()));
      }
      // 'all' = no status filter

      // Search filter (email)
      conditions.push(...buildSearch(params?.search, workspaceInvitations.email));

      // Role filter
      conditions.push(...buildFilters(
        { role: params?.role },
        { role: workspaceInvitations.role },
      ));

      // Count total
      const [{ count: total }] = await db
        .select({ count: count() })
        .from(workspaceInvitations)
        .innerJoin(users, eq(users.id, workspaceInvitations.createdBy))
        .where(and(...conditions));

      // Sort
      const sortExpr = buildSort(
        params?.sort,
        params?.order,
        { email: workspaceInvitations.email, role: workspaceInvitations.role, expiresAt: workspaceInvitations.expiresAt },
        workspaceInvitations.createdAt,
      );

      // Paginate
      const page = params?.page ?? 1;
      const perPage = params?.perPage ?? 10;
      const offset = (page - 1) * perPage;

      const data = await db
        .select({
          id: workspaceInvitations.id,
          email: workspaceInvitations.email,
          role: workspaceInvitations.role,
          invitedBy: users.name,
          createdAt: workspaceInvitations.createdAt,
          expiresAt: workspaceInvitations.expiresAt,
        })
        .from(workspaceInvitations)
        .innerJoin(users, eq(users.id, workspaceInvitations.createdBy))
        .where(and(...conditions))
        .orderBy(sortExpr)
        .limit(perPage)
        .offset(offset);

      logger.invitation.info('listInvitations completed', { workspaceId, count: data.length });
      return { data, ...buildPaginationMeta(total, page, perPage) };
    } catch (error) {
      logger.invitation.error('listInvitations: failed', { workspaceId, error });
      throw error;
    }
  },

  /**
   * Find invitation by ID (for ownership check).
   */
  async find(invitationId: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('findInvitation', { invitationId });
    try {
      const [inv] = await exec.select().from(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId)).limit(1);
      if (!inv) {
        logger.invitation.warn('findInvitation: not found', { invitationId });
      }
      return inv ?? null;
    } catch (error) {
      logger.invitation.error('findInvitation: failed', { invitationId, error });
      throw error;
    }
  },

  /**
   * Find a pending (not accepted, not expired) invitation for a workspace + email.
   */
  async findPending(workspaceId: string, email: string) {
    logger.invitation.info('findPending', { workspaceId, email });
    try {
      const [inv] = await db
        .select()
        .from(workspaceInvitations)
        .where(
          and(
            eq(workspaceInvitations.workspaceId, workspaceId),
            eq(workspaceInvitations.email, email),
            isNull(workspaceInvitations.acceptedAt),
            gt(workspaceInvitations.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!inv) {
        logger.invitation.warn('findPendingInvitation: no pending invitation found', { workspaceId, email });
      }
      return inv ?? null;
    } catch (error) {
      logger.invitation.error('findPendingInvitation: failed', { workspaceId, email, error });
      throw error;
    }
  },

  /**
   * Create a workspace invitation record.
   */
  async create(data: {
    email: string;
    role: string;
    workspaceId: string;
    invitedBy: string;
    token: string;
    expiresAt: Date;
  }, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('createInvitation', { workspaceId: data.workspaceId, email: data.email });
    try {
      const [invitation] = await exec
        .insert(workspaceInvitations)
        .values({
          email: data.email,
          role: data.role,
          workspaceId: data.workspaceId,
          createdBy: data.invitedBy,
          token: data.token,
          expiresAt: data.expiresAt,
        })
        .returning();
      logger.invitation.info('createInvitation completed', { invitationId: invitation.id });
      return invitation;
    } catch (error) {
      logger.invitation.error('createInvitation: failed', { workspaceId: data.workspaceId, email: data.email, error });
      throw error;
    }
  },

  /**
   * Revoke an invitation by expiring it (preserves row for audit trail).
   */
  async revoke(invitationId: string) {
    logger.invitation.info('revokeInvitation', { invitationId });
    try {
      await db
        .update(workspaceInvitations)
        .set({ expiresAt: new Date() })
        .where(eq(workspaceInvitations.id, invitationId));
      logger.invitation.info('revokeInvitation completed', { invitationId });
    } catch (error) {
      logger.invitation.error('revokeInvitation: failed', { invitationId, error });
      throw error;
    }
  },

  /**
   * Find a workspace by ID (for resolving workspace name in invitations).
   */
  async findWorkspaceById(id: string) {
    logger.invitation.info('findWorkspaceById', { workspaceId: id });
    try {
      const [ws] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
      if (!ws) {
        logger.invitation.warn('findWorkspaceById: workspace not found', { workspaceId: id });
      }
      return ws ?? null;
    } catch (error) {
      logger.invitation.error('findWorkspaceById: failed', { workspaceId: id, error });
      throw error;
    }
  },

  /**
   * Check if an email is already a workspace member.
   */
  async isEmailWorkspaceMember(workspaceId: string, email: string, tx?: Tx): Promise<boolean> {
    const exec = tx ?? db;
    logger.invitation.info('isEmailWorkspaceMember', { workspaceId, email });
    try {
      const [{ exists }] = await exec
        .select({ exists: count() })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(users.email, email),
            isNull(users.deletedAt),
          ),
        );
      const result = exists > 0;
      logger.invitation.info('isEmailWorkspaceMember completed', { workspaceId, email, isMember: result });
      return result;
    } catch (error) {
      logger.invitation.error('isEmailWorkspaceMember: failed', { workspaceId, email, error });
      throw error;
    }
  },
};
