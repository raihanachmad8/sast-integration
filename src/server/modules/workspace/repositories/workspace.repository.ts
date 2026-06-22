import { eq, and, isNull, gt, inArray } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { workspaces, workspaceMembers } from '@drizzle/schema';
import { workspaceInvitations } from '@drizzle/schema/auth';
import { users } from '@drizzle/schema/users';
import { ROLE } from '@/commons/constants/permissions';
import { WORKSPACE } from '../constants';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Role = typeof ROLE[keyof typeof ROLE];

export const workspaceRepository = {
  /**
   * List all non-deleted workspaces for a user with their role.
   *
   * @param userId - User UUID
   * @returns Array of workspace records with role and joinedAt
   */
  async listByUser(userId: string) {
    return db
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
  },

  /**
   * Find a non-deleted workspace by ID.
   *
   * @param id - Workspace UUID
   * @returns Workspace record, or null if not found
   */
  async findById(id: string) {
    const [ws] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
    return ws ?? null;
  },

  /** Find workspace by slug. Excludes soft-deleted workspaces. */
  async findBySlug(slug: string, tx?: Tx) {
    const executor = tx ?? db;
    const [ws] = await executor.select().from(workspaces).where(and(eq(workspaces.slug, slug), isNull(workspaces.deletedAt))).limit(1);
    return ws ?? null;
  },

  /** Find an active personal workspace created by this user */
  async findActivePersonalByOwner(userId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [ws] = await executor
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.createdBy, userId), eq(workspaces.type, WORKSPACE.TYPE.PERSONAL), isNull(workspaces.deletedAt)))
      .limit(1);
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
    const [member] = await db.select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
      .limit(1);
    return member?.role ?? null;
  },

  /**
   * Insert a new workspace record.
   *
   * @param data - Workspace creation data (name, slug, type, description, createdBy)
   * @param tx - Optional database transaction
   * @returns Created workspace record
   */
  async create(data: { name: string; slug: string; type?: 'personal' | 'organization'; description?: string; createdBy: string }, tx?: Tx) {
    const executor = tx ?? db;
    const [ws] = await executor.insert(workspaces).values({
      name: data.name,
      slug: data.slug,
      type: data.type ?? WORKSPACE.TYPE.ORGANIZATION,
      description: data.description,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    }).returning();
    return ws;
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
    const executor = tx ?? db;
    await executor.insert(workspaceMembers).values({ workspaceId, userId, role });
  },

  /** Update workspace fields */
  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }) {
    const [ws] = await db.update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return ws;
  },

  /** Soft delete workspace */
  async delete(id: string, deletedBy: string) {
    await db.update(workspaces)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(workspaces.id, id));
  },

  /** Update user's current workspace */
  async switchWorkspace(userId: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.update(users)
      .set({ currentWorkspaceId: workspaceId })
      .where(eq(users.id, userId));
  },

  /** List all members of a workspace with user details. Excludes soft-deleted users. */
  async listMembers(workspaceId: string) {
    return db
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
  },

  /** Update a member's role */
  async updateMemberRole(workspaceId: string, userId: string, role: Role) {
    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning();
    return updated ?? null;
  },

  /** Remove a member from workspace */
  async removeMember(workspaceId: string, userId: string) {
    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  },

  /** List pending (not accepted, not expired) invitations for a workspace */
  async listInvitations(workspaceId: string) {
    return db
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
  },

  /** Delete an invitation by ID */
  async revokeInvitation(invitationId: string) {
    await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId));
  },

  /** Find invitation by ID (for ownership check) */
  async findInvitation(invitationId: string) {
    const [inv] = await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.id, invitationId)).limit(1);
    return inv ?? null;
  },

  /** Create a workspace invitation record */
  async createInvitation(data: { email: string; role: string; workspaceId: string; invitedBy: string; token: string; expiresAt: Date }) {
    const [invitation] = await db.insert(workspaceInvitations).values({
      email: data.email,
      role: data.role,
      workspaceId: data.workspaceId,
      createdBy: data.invitedBy,
      token: data.token,
      expiresAt: data.expiresAt,
    }).returning();
    return invitation;
  },

  /** Find which of the given user IDs are members of a workspace */
  async findMemberUserIds(workspaceId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.userId, userIds),
        ),
      );
    return rows.map((r) => r.userId);
  },

  /** List all pending invitations for a user by email (not accepted, not expired) */
  async listPendingInvitationsByEmail(email: string) {
    return db
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
  },

  /** Accept an invitation: add user to workspace + mark invitation accepted */
  async acceptInvitation(invitationId: string, userId: string, tx?: Tx) {
    const executor = tx ?? db;
    const invitation = await executor
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.id, invitationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invitation) return null;

    await executor.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role as 'owner' | 'manager' | 'reviewer' | 'member',
    });

    await executor
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitationId));

    return { workspaceId: invitation.workspaceId, role: invitation.role };
  },
};
