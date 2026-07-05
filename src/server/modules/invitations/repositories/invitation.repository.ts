import { and, eq, gt, isNull, isNotNull, lte, count } from 'drizzle-orm';

import type { InvitationListQuery } from '@/commons/schemas/member.schema';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildFilters, buildSort, buildPaginationMeta } from '@/server/lib/query';
import type { Paginated } from '@/server/modules/shared/contracts';
import { workspaceMembers } from '@drizzle/schema';
import { workspaces } from '@drizzle/schema';
import { workspaceInvitations } from '@drizzle/schema/auth';
import type { WorkspaceInvitation } from '@drizzle/schema/auth';
import { users } from '@drizzle/schema/users';

export interface InvitationRepository {
  list(workspaceId: string, params?: InvitationListQuery, tx?: Tx): Promise<Paginated<{ id: string; email: string; role: string; invitedBy: string | null; createdAt: Date; expiresAt: Date }>>;
  find(invitationId: string, tx?: Tx): Promise<WorkspaceInvitation | null>;
  findPending(workspaceId: string, email: string, tx?: Tx): Promise<WorkspaceInvitation | null>;
  create(data: { email: string; role: string; workspaceId: string; invitedBy: string; token: string; expiresAt: Date }, tx?: Tx): Promise<WorkspaceInvitation>;
  revoke(invitationId: string, tx?: Tx): Promise<void>;
  findWorkspaceById(id: string): Promise<{ id: string; name: string } | null>;
  isEmailWorkspaceMember(workspaceId: string, email: string, tx?: Tx): Promise<boolean>;
  listPendingInvitationsByEmail(email: string): Promise<{ id: string; email: string; role: string; workspaceId: string; workspaceName: string; workspaceSlug: string; invitedBy: string | null; createdAt: Date; expiresAt: Date }[]>;
  acceptInvitation(invitationId: string, userId: string, tx?: Tx): Promise<{ workspaceId: string; role: string } | null>;
}

export const invitationRepository: InvitationRepository = {
  async list(workspaceId: string, params?: InvitationListQuery) {
    logger.invitation.info('listInvitations', { workspaceId });
    const conditions = [
      eq(workspaceInvitations.workspaceId, workspaceId),
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
      .leftJoin(users, eq(users.id, workspaceInvitations.createdBy))
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
      .leftJoin(users, eq(users.id, workspaceInvitations.createdBy))
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset(offset);

    logger.invitation.info('listInvitations completed', { workspaceId, count: data.length });
    return { data, ...buildPaginationMeta(total, page, perPage) };
  },

  async find(invitationId: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('findInvitation', { invitationId });
    const [inv] = await exec.select().from(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId)).limit(1);
    if (!inv) {
      logger.invitation.warn('findInvitation: not found', { invitationId });
    }
    return inv ?? null;
  },

  async findPending(workspaceId: string, email: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('findPending', { workspaceId, email });
    const [inv] = await exec
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
      logger.invitation.warn('findPending: no pending invitation found', { workspaceId, email });
    }
    return inv ?? null;
  },

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
  },

  async revoke(invitationId: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('revokeInvitation', { invitationId });
    await exec
      .update(workspaceInvitations)
      .set({ expiresAt: new Date() })
      .where(and(
        eq(workspaceInvitations.id, invitationId),
        isNull(workspaceInvitations.acceptedAt),
      ));
    logger.invitation.info('revokeInvitation completed', { invitationId });
  },

  async findWorkspaceById(id: string) {
    logger.invitation.info('findWorkspaceById', { workspaceId: id });
    const [ws] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
    if (!ws) {
      logger.invitation.warn('findWorkspaceById: workspace not found', { workspaceId: id });
    }
    return ws ?? null;
  },

  async isEmailWorkspaceMember(workspaceId: string, email: string, tx?: Tx): Promise<boolean> {
    const exec = tx ?? db;
    logger.invitation.info('isEmailWorkspaceMember', { workspaceId, email });
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
  },

  async listPendingInvitationsByEmail(email: string) {
    logger.invitation.info('listPendingInvitationsByEmail', { email });
    const rows = await db
      .select({
        id: workspaceInvitations.id,
        email: workspaceInvitations.email,
        role: workspaceInvitations.role,
        workspaceId: workspaceInvitations.workspaceId,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        invitedBy: users.name,
        createdAt: workspaceInvitations.createdAt,
        expiresAt: workspaceInvitations.expiresAt,
      })
      .from(workspaceInvitations)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
      .leftJoin(users, eq(users.id, workspaceInvitations.createdBy))
      .where(and(
        eq(workspaceInvitations.email, email),
        isNull(workspaceInvitations.acceptedAt),
        gt(workspaceInvitations.expiresAt, new Date()),
        isNull(workspaces.deletedAt),
        isNull(users.deletedAt),
      ));
    logger.invitation.info('listPendingInvitationsByEmail completed', { email, count: rows.length });
    return rows;
  },

  async acceptInvitation(invitationId: string, userId: string, tx?: Tx) {
    const exec = tx ?? db;
    logger.invitation.info('acceptInvitation', { invitationId, userId });
    const invitation = await exec
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, invitationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invitation) {
      logger.invitation.warn('acceptInvitation: invitation not found', { invitationId });
      return null;
    }

    await exec.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role as 'owner' | 'manager' | 'reviewer' | 'member',
    });

    await exec
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitationId));

    logger.invitation.info('acceptInvitation completed', { invitationId, workspaceId: invitation.workspaceId });
    return { workspaceId: invitation.workspaceId, role: invitation.role };
  },
};
