import { eq, and, isNull, gt, inArray } from 'drizzle-orm';

import { ROLE } from '@/commons/constants/permissions';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { workspaces, workspaceMembers } from '@drizzle/schema';
import { workspaceInvitations } from '@drizzle/schema/auth';
import { users } from '@drizzle/schema/users';

import { WORKSPACE } from '../constants';


type Role = typeof ROLE[keyof typeof ROLE];

export const workspaceRepository = {
  /**
   * List all non-deleted workspaces for a user with their role.
   *
   * @param userId - User UUID
   * @returns Array of workspace records with role and joinedAt
   */
  async list(userId: string) {
    logger.workspace.info('listByUser', { userId });
    try {
      const rows = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          type: workspaces.type,
          description: workspaces.description,
          avatarUrl: workspaces.avatarUrl,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
        .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)));
      logger.workspace.info('list completed', { userId, count: rows.length });
      return rows;
    } catch (error) {
      logger.workspace.error('listByUser failed', { userId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Find a non-deleted workspace by ID.
   *
   * @param id - Workspace UUID
   * @returns Workspace record, or null if not found
   */
  async findById(id: string) {
    logger.workspace.info('findById', { id });
    const [ws] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
    if (!ws) {
      logger.workspace.warn('findById: workspace not found', { id });
    }
    return ws ?? null;
  },

  /** Find workspace by slug. Excludes soft-deleted workspaces. */
  async findBySlug(slug: string, tx?: Tx) {
    logger.workspace.info('findBySlug', { slug });
    const executor = tx ?? db;
    const [ws] = await executor.select().from(workspaces).where(and(eq(workspaces.slug, slug), isNull(workspaces.deletedAt))).limit(1);
    if (!ws) {
      logger.workspace.warn('findBySlug: workspace not found', { slug });
    }
    return ws ?? null;
  },

  /** Find an active personal workspace created by this user */
  async findActivePersonalByOwner(userId: string, tx?: Tx) {
    logger.workspace.info('findActivePersonalByOwner', { userId });
    const executor = tx ?? db;
    const [ws] = await executor
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.createdBy, userId), eq(workspaces.type, WORKSPACE.TYPE.PERSONAL), isNull(workspaces.deletedAt)))
      .limit(1);
    if (!ws) {
      logger.workspace.warn('findActivePersonalByOwner: no personal workspace found', { userId });
    }
    return ws ?? null;
  },

  /**
   * Get a user's role in a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID
   * @returns Role string, or null if not a member
   */
  async getMemberRole(workspaceId: string, userId: string) {
    logger.workspace.info('getMemberRole', { workspaceId, userId });
    const [member] = await db.select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
      .limit(1);
    const role = member?.role ?? null;
    if (!role) {
      logger.workspace.warn('getMemberRole: member not found', { workspaceId, userId });
    }
    return role;
  },

  /**
   * Insert a new workspace record.
   *
   * @param data - Workspace creation data (name, slug, type, description, createdBy)
   * @param tx - Optional database transaction
   * @returns Created workspace record
   */
  async create(data: { name: string; slug: string; type?: 'personal' | 'organization'; description?: string; createdBy: string }, tx?: Tx) {
    logger.workspace.info('create workspace', { name: data.name, slug: data.slug, createdBy: data.createdBy });
    try {
      const executor = tx ?? db;
      const [ws] = await executor.insert(workspaces).values({
        name: data.name,
        slug: data.slug,
        type: data.type ?? WORKSPACE.TYPE.ORGANIZATION,
        description: data.description,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }).returning();
      logger.workspace.info('create workspace completed', { workspaceId: ws.id, name: data.name });
      return ws;
    } catch (error) {
      logger.workspace.error('create workspace failed', { name: data.name, slug: data.slug, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Add a member to a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @param userId - User UUID to add as a member
   * @param role - Role to assign (owner, manager, reviewer, member)
   * @param tx - Optional database transaction
   */
  async addMember(workspaceId: string, userId: string, role: Role, tx?: Tx) {
    logger.workspace.info('addMember', { workspaceId, userId, role });
    const executor = tx ?? db;
    await executor.insert(workspaceMembers).values({ workspaceId, userId, role });
    logger.workspace.info('addMember completed', { workspaceId, userId });
  },

  /** Update workspace fields */
  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }) {
    logger.workspace.info('update workspace', { id });
    try {
      const [ws] = await db.update(workspaces)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(workspaces.id, id))
        .returning();
      if (!ws) {
        logger.workspace.warn('update: workspace not found', { id });
      }
      return ws;
    } catch (error) {
      logger.workspace.error('update workspace failed', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /** Soft delete workspace */
  async delete(id: string, deletedBy: string) {
    logger.workspace.info('delete workspace', { id, deletedBy });
    await db.update(workspaces)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(workspaces.id, id));
    logger.workspace.info('delete workspace completed', { id });
  },

  /** Update user's current workspace */
  async switchWorkspace(userId: string, workspaceId: string, tx?: Tx) {
    logger.workspace.info('switchWorkspace', { userId, workspaceId });
    const executor = tx ?? db;
    await executor.update(users)
      .set({ currentWorkspaceId: workspaceId })
      .where(eq(users.id, userId));
    logger.workspace.info('switchWorkspace completed', { userId, workspaceId });
  },

  /** List all members of a workspace with user details. Excludes soft-deleted users. */
  async members(workspaceId: string) {
    logger.workspace.info('listMembers', { workspaceId });
    try {
      const rows = await db
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
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), isNull(users.deletedAt)));
      logger.workspace.info('members completed', { workspaceId, count: rows.length });
      return rows;
    } catch (error) {
      logger.workspace.error('listMembers failed', { workspaceId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /** Update a member's role */
  async updateRole(workspaceId: string, userId: string, role: Role) {
    logger.workspace.info('updateRole', { workspaceId, userId, role });
    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning();
    if (!updated) {
      logger.workspace.warn('updateMemberRole: member not found', { workspaceId, userId });
    }
    return updated ?? null;
  },

  /** Remove a member from workspace */
  async removeMember(workspaceId: string, userId: string) {
    logger.workspace.info('removeMember', { workspaceId, userId });
    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    logger.workspace.info('removeMember completed', { workspaceId, userId });
  },

  /** List pending (not accepted, not expired) invitations for a workspace */
  async invitations(workspaceId: string) {
    logger.workspace.info('listInvitations', { workspaceId });
    try {
      const rows = await db
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
        .where(and(
          eq(workspaceInvitations.workspaceId, workspaceId),
          isNull(workspaceInvitations.acceptedAt),
          gt(workspaceInvitations.expiresAt, new Date()),
          isNull(users.deletedAt),
        ));
      logger.workspace.info('invitations completed', { workspaceId, count: rows.length });
      return rows;
    } catch (error) {
      logger.workspace.error('listInvitations failed', { workspaceId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /** Delete an invitation by ID */
  async revokeInvitation(invitationId: string) {
    logger.workspace.info('revokeInvitation', { invitationId });
    await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId));
    logger.workspace.info('revokeInvitation completed', { invitationId });
  },

  /** Find invitation by ID (for ownership check) */
  async findInvitation(invitationId: string) {
    logger.workspace.info('findInvitation', { invitationId });
    const [inv] = await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId)).limit(1);
    if (!inv) {
      logger.workspace.warn('findInvitation: not found', { invitationId });
    }
    return inv ?? null;
  },

  /** Find a pending (not accepted, not expired) invitation for a workspace + email */
  async findPendingInvitation(workspaceId: string, email: string) {
    logger.workspace.info('findPendingInvitation', { workspaceId, email });
    const [inv] = await db
      .select()
      .from(workspaceInvitations)
      .where(and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.email, email),
        isNull(workspaceInvitations.acceptedAt),
        gt(workspaceInvitations.expiresAt, new Date()),
      ))
      .limit(1);
    if (!inv) {
      logger.workspace.warn('findPendingInvitation: no pending invitation found', { workspaceId, email });
    }
    return inv ?? null;
  },

  /** Create a workspace invitation record */
  async createInvitation(data: { email: string; role: string; workspaceId: string; invitedBy: string; token: string; expiresAt: Date }) {
    logger.workspace.info('createInvitation', { email: data.email, role: data.role, workspaceId: data.workspaceId });
    const [invitation] = await db.insert(workspaceInvitations).values({
      email: data.email,
      role: data.role,
      workspaceId: data.workspaceId,
      createdBy: data.invitedBy,
      token: data.token,
      expiresAt: data.expiresAt,
    }).returning();
    logger.workspace.info('createInvitation completed', { invitationId: invitation.id, email: data.email });
    return invitation;
  },

  /** Find which of the given user IDs are members of a workspace */
  async findMemberUserIds(workspaceId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      logger.workspace.debug('findMemberUserIds: empty input', { workspaceId });
      return [];
    }
    logger.workspace.info('findMemberUserIds', { workspaceId, inputCount: userIds.length });
    const rows = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.userId, userIds),
        ),
      );
    logger.workspace.info('findMemberUserIds completed', { workspaceId, matchCount: rows.length });
    return rows.map((r) => r.userId);
  },

  /** List all pending invitations for a user by email (not accepted, not expired) */
  async listPendingInvitationsByEmail(email: string) {
    logger.workspace.info('listPendingInvitationsByEmail', { email });
    try {
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
      logger.workspace.info('listPendingInvitationsByEmail completed', { email, count: rows.length });
      return rows;
    } catch (error) {
      logger.workspace.error('listPendingInvitationsByEmail failed', { email, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /** Accept an invitation: add user to workspace + mark invitation accepted */
  async acceptInvitation(invitationId: string, userId: string, tx?: Tx) {
    logger.workspace.info('acceptInvitation', { invitationId, userId });
    const executor = tx ?? db;
    const invitation = await executor
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, invitationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invitation) {
      logger.workspace.warn('acceptInvitation: invitation not found', { invitationId });
      return null;
    }

    await executor.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role as 'owner' | 'manager' | 'reviewer' | 'member',
    });

    await executor
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitationId));

    logger.workspace.info('acceptInvitation completed', { invitationId, workspaceId: invitation.workspaceId });
    return { workspaceId: invitation.workspaceId, role: invitation.role };
  },
};
