import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { workspaces, workspaceMembers } from '../../../../drizzle/schema/workspaces';
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
      .where(eq(workspaceMembers.userId, userId));
  },

  /** Find workspace by ID */
  async findById(id: string) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return ws ?? null;
  },

  /** Find workspace by slug */
  async findBySlug(slug: string) {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
    return ws ?? null;
  },

  /** Get user's role in a workspace */
  async getMemberRole(workspaceId: string, userId: string) {
    const [member] = await db.select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .limit(1);
    return member?.role ?? null;
  },

  /** Create workspace + return record */
  async create(data: { name: string; slug: string; description?: string; createdBy: string }, tx?: Tx) {
    const executor = tx ?? db;
    const [ws] = await executor.insert(workspaces).values({
      name: data.name,
      slug: data.slug,
      type: WORKSPACE.TYPE.ORGANIZATION,
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
  async switchWorkspace(userId: string, workspaceId: string) {
    await db.update(users)
      .set({ currentWorkspaceId: workspaceId })
      .where(eq(users.id, userId));
  },
};
