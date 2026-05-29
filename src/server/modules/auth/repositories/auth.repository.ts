import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users, sessions, workspaceInvitations } from '../../../../../drizzle/schema';
import { workspaces, workspaceMembers } from '../../../../../drizzle/schema/workspaces';
import type { NewUser } from '../../../../../drizzle/schema/users';
import { AUTH } from '../constants';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const authRepository = {
  /**
   * Find a user by email address.
   * @param email - User email to search
   * @returns User record or null if not found
   */
  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  /**
   * Find a user by ID.
   * @param id - User UUID
   * @returns User record or null if not found
   */
  async findUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  /**
   * Create a new user record.
   * @param data - User data (email, passwordHash, name, optional emailVerifiedAt)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created user record
   */
  async createUser(data: NewUser, tx?: Tx) {
    const executor = tx ?? db;
    const [user] = await executor.insert(users).values(data).returning();
    return user;
  },

  /**
   * Create a new session record.
   * @param data - Session data (id, userId, optional ipAddress, userAgent)
   * @returns Created session record
   */
  async createSession(data: { id: string; userId: string; ipAddress?: string; userAgent?: string }) {
    const [session] = await db.insert(sessions).values({
      id: data.id,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      lastActivity: new Date(),
    }).returning();
    return session;
  },

  /**
   * Find an active session by ID.
   * @param id - Session UUID
   * @returns Session record or null if not found (deleted/expired)
   */
  async findSession(id: string) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return session ?? null;
  },

  /**
   * Delete a session (signout/invalidation).
   * @param id - Session UUID to delete
   */
  async deleteSession(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id));
  },

  /**
   * Create a workspace invitation record.
   * @param data - Invitation data (email, role, workspaceId, invitedBy, token)
   * @returns Created invitation record
   */
  async createInvitation(data: { email: string; role: string; workspaceId: string; invitedBy: string; token: string }) {
    const [invitation] = await db.insert(workspaceInvitations).values({
      email: data.email,
      role: data.role,
      workspaceId: data.workspaceId,
      createdBy: data.invitedBy,
      token: data.token,
      expiresAt: new Date(Date.now() + AUTH.INVITE_EXPIRY_MS),
    }).returning();
    return invitation;
  },

  /**
   * Find an invitation by its unique token.
   * @param token - Hex token string
   * @returns Invitation record or null
   */
  async findInvitationByToken(token: string) {
    const [invitation] = await db.select().from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token)).limit(1);
    return invitation ?? null;
  },

  /**
   * Mark an invitation as accepted by setting acceptedAt timestamp.
   * @param id - Invitation UUID
   * @param tx - Optional transaction context
   */
  async markInvitationAccepted(id: string, tx?: Tx) {
    const executor = tx ?? db;
    await executor.update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, id));
  },

  /**
   * Get user's current workspace with their role.
   * @param userId - User UUID
   * @param workspaceId - Workspace UUID
   * @returns Workspace info with user's role, or null
   */
  async getUserWorkspace(userId: string, workspaceId: string) {
    const [result] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    return result ?? null;
  },
};
