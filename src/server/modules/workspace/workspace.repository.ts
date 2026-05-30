import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { workspaces, workspaceMembers } from '../../../../drizzle/schema/workspaces';
import { workspaceInvitations } from '../../../../drizzle/schema/auth';
import { users } from '../../../../drizzle/schema/users';
import { ROLE } from '@/commons/constants/permissions';
import { WORKSPACE } from './constants';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Role = typeof ROLE[keyof typeof ROLE];

export const workspaceRepository = {
  /** List all workspaces for a user with their role */
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

  /** Find workspace by ID */
  async findById(id: string) {
    const [ws] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
    return ws ?? null;
  },

  /** Find workspace by slug */
  async findBySlug(slug: string, tx?: Tx) {
    const executor = tx ?? db;
    const [ws] = await executor.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
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

  /** Get user's role in a workspace */
  async getMemberRole(workspaceId: string, userId: string) {
    const [member] = await db.select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
      .limit(1);
    return member?.role ?? null;
  },

  /** Create workspace + return record */
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

  /** Add member to workspace */
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

  /** List all members of a workspace with user details */
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
      .where(eq(workspaceMembers.workspaceId, workspaceId));
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
        createdAt: workspaceInvitations.createdAt,
        expiresAt: workspaceInvitations.expiresAt,
      })
      .from(workspaceInvitations)
      .where(and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        isNull(workspaceInvitations.acceptedAt),
        gt(workspaceInvitations.expiresAt, new Date()),
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
};
