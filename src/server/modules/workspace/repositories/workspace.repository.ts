import { eq, and, isNull, inArray } from 'drizzle-orm';

import { ROLE } from '@/commons/constants/permissions';
import type { WorkspaceListItem, WorkspaceMemberView } from '@/commons/types/workspace';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { workspaces, workspaceMembers, type Workspace, type WorkspaceMember } from '@drizzle/schema';
import { users } from '@drizzle/schema/users';

import { WORKSPACE } from '../constants';

type Role = typeof ROLE[keyof typeof ROLE];

export interface IWorkspaceRepository {
  list(userId: string, tx?: Tx): Promise<WorkspaceListItem[]>;
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string, tx?: Tx): Promise<Workspace | null>;
  findActivePersonalByOwner(userId: string, tx?: Tx): Promise<Workspace | null>;
  getMemberRole(workspaceId: string, userId: string): Promise<string | null>;
  create(data: { name: string; slug: string; type?: 'personal' | 'organization'; description?: string; createdBy: string }, tx?: Tx): Promise<Workspace>;
  addMember(workspaceId: string, userId: string, role: Role, tx?: Tx): Promise<void>;
  update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }, tx?: Tx): Promise<Workspace | undefined>;
  delete(id: string, deletedBy: string): Promise<void>;
  switchWorkspace(userId: string, workspaceId: string, tx?: Tx): Promise<void>;
  members(workspaceId: string, tx?: Tx): Promise<WorkspaceMemberView[]>;
  updateRole(workspaceId: string, userId: string, role: Role): Promise<WorkspaceMember | null>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  findMemberUserIds(workspaceId: string, userIds: string[]): Promise<string[]>;
}

export const workspaceRepository: IWorkspaceRepository = {
  /**
   * List all non-deleted workspaces for a user with their role.
   *
   * @param userId - User UUID
   * @returns Array of workspace records with role and joinedAt
   */
  async list(userId: string, tx?: Tx) {
    logger.workspace.info('listByUser', { userId });
    const executor = tx ?? db;
    const rows = await executor
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
    const data: WorkspaceListItem[] = rows.map((row) => ({
      ...row,
      joinedAt: row.joinedAt.toISOString(),
    }));
    logger.workspace.info('list completed', { userId, count: data.length });
    return data;
  },

  /**
   * Find a non-deleted workspace by ID.
   *
   * @param id - Workspace UUID
   * @returns Workspace record, or null if not found
   */
  async findById(id: string) {
    logger.workspace.info('findById', { id });
    const executor = db;
    const [ws] = await executor.select().from(workspaces).where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt))).limit(1);
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
    const executor = db;
    const [member] = await executor.select({ role: workspaceMembers.role })
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
  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }, tx?: Tx) {
    logger.workspace.info('update workspace', { id });
    const executor = tx ?? db;
    const [ws] = await executor.update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    if (!ws) {
      logger.workspace.warn('update: workspace not found', { id });
    }
    return ws;
  },

  /** Soft delete workspace */
  async delete(id: string, deletedBy: string) {
    logger.workspace.info('delete workspace', { id, deletedBy });
    const executor = db;
    await executor.update(workspaces)
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
  async members(workspaceId: string, tx?: Tx) {
    logger.workspace.info('listMembers', { workspaceId });
    const executor = tx ?? db;
    const rows = await executor
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
    const data: WorkspaceMemberView[] = rows.map((row) => ({ ...row, joinedAt: row.joinedAt.toISOString() }));
    logger.workspace.info('members completed', { workspaceId, count: data.length });
    return data;
  },

  /** Update a member's role */
  async updateRole(workspaceId: string, userId: string, role: Role) {
    logger.workspace.info('updateRole', { workspaceId, userId, role });
    const executor = db;
    const [updated] = await executor
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .returning();
    if (!updated) logger.workspace.warn('updateMemberRole: member not found', { workspaceId, userId });
    return updated ?? null;
  },

  /** Remove a member from workspace */
  async removeMember(workspaceId: string, userId: string) {
    logger.workspace.info('removeMember', { workspaceId, userId });
    const executor = db;
    await executor
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    logger.workspace.info('removeMember completed', { workspaceId, userId });
  },

  /** Find which of the given user IDs are members of a workspace */
  async findMemberUserIds(workspaceId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    logger.workspace.info('findMemberUserIds', { workspaceId, inputCount: userIds.length });
    const executor = db;
    const rows = await executor
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), inArray(workspaceMembers.userId, userIds)));
    logger.workspace.info('findMemberUserIds completed', { workspaceId, matchCount: rows.length });
    return rows.map((r) => r.userId);
  },
};
