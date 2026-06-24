import { eq, and, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { users, sessions, workspaceInvitations, workspaces, workspaceMembers } from '@drizzle/schema';
import type { NewUser } from '@drizzle/schema/users';
import { AUTH } from '../constants';
import { logger } from '@/server/lib/logger';

export const authRepository = {
  /**
   * Find a user by email address. Excludes soft-deleted users.
   * @param email - User email to search
   * @returns User record or null if not found
   */
  async findUserByEmail(email: string) {
    logger.auth.debug('findUserByEmail called', { email });
    const [user] = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
    return user ?? null;
  },

  /**
   * Find a user by ID. Excludes soft-deleted users.
   * @param id - User UUID
   * @returns User record or null if not found
   */
  async findUserById(id: string) {
    logger.auth.debug('findUserById called', { id });
    const [user] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
    return user ?? null;
  },

  /**
   * Create a new user record.
   * @param data - User data (email, passwordHash, name, optional emailVerifiedAt)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created user record
   */
  async createUser(data: NewUser, tx?: Tx) {
    logger.auth.debug('createUser called', { email: data.email });
    try {
      const executor = tx ?? db;
      const [user] = await executor.insert(users).values(data).returning();
      return user;
    } catch (error) {
      logger.auth.error('createUser failed', { error });
      throw error;
    }
  },

  /**
   * Create a new session record.
   * @param data - Session data (id, userId, optional ipAddress, userAgent)
   * @returns Created session record
   */
  async createSession(data: { 
    id: string; 
    userId: string; 
    ipAddress?: string; 
    userAgent?: string;
    currentRefreshTokenId?: string;
  }) {
    logger.auth.debug('createSession called', { userId: data.userId });
    try {
      const [session] = await db.insert(sessions).values({
        id: data.id,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + AUTH.SESSION_TTL_MS),
        currentRefreshTokenId: data.currentRefreshTokenId,
      }).returning();
      return session;
    } catch (error) {
      logger.auth.error('createSession failed', { error });
      throw error;
    }
  },

  /**
   * Find an active session by ID. Returns null if not found or expired.
   * @param id - Session UUID
   */
  async findSession(id: string) {
    logger.auth.debug('findSession called', { id });
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }
    return session;
  },

  /**
   * Delete a session (signout/invalidation).
   * @param id - Session UUID to delete
   */
  async deleteSession(id: string) {
    logger.auth.debug('deleteSession called', { id });
    try {
      await db.delete(sessions).where(eq(sessions.id, id));
    } catch (error) {
      logger.auth.error('deleteSession failed', { error });
      throw error;
    }
  },

  /**
   * Atomically updates the active refresh token identifier for a session.
   *
   * This is called on every successful refresh token rotation so that
   * subsequent refresh attempts can be validated against the latest ID.
   *
   * @param sessionId - The session to update
   * @param newRefreshTokenId - The newly generated refresh token identifier
   */
  async updateSessionRefreshToken(sessionId: string, newRefreshTokenId: string) {
    logger.auth.debug('updateSessionRefreshToken called', { sessionId });
    try {
      await db
        .update(sessions)
        .set({ 
          currentRefreshTokenId: newRefreshTokenId,
          lastActivity: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      logger.auth.error('updateSessionRefreshToken failed', { error });
      throw error;
    }
  },


  /**
   * Create a workspace invitation record.
   * @param data - Invitation data (email, role, workspaceId, invitedBy, token)
   * @returns Created invitation record
   */
  async createInvitation(data: { email: string; role: string; workspaceId: string; invitedBy: string; token: string }) {
    logger.auth.debug('createInvitation called', { email: data.email, workspaceId: data.workspaceId });
    try {
      const [invitation] = await db.insert(workspaceInvitations).values({
        email: data.email,
        role: data.role,
        workspaceId: data.workspaceId,
        createdBy: data.invitedBy,
        token: data.token,
        expiresAt: new Date(Date.now() + AUTH.INVITE_EXPIRY_MS),
      }).returning();
      return invitation;
    } catch (error) {
      logger.auth.error('createInvitation failed', { error });
      throw error;
    }
  },

  /**
   * Find an invitation by its unique token.
   * @param token - Hex token string
   * @returns Invitation record or null
   */
  async findInvitationByToken(token: string) {
    logger.auth.debug('findInvitationByToken called');
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
    logger.auth.debug('markInvitationAccepted called', { id });
    try {
      const executor = tx ?? db;
      await executor.update(workspaceInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(workspaceInvitations.id, id));
    } catch (error) {
      logger.auth.error('markInvitationAccepted failed', { error });
      throw error;
    }
  },

  /**
   * Get user's current workspace with their role.
   * @param userId - User UUID
   * @param workspaceId - Workspace UUID
   * @returns Workspace info with user's role, or null
   */
  async getUserWorkspace(userId: string, workspaceId: string) {
    logger.auth.debug('getUserWorkspace called', { userId, workspaceId });
    const [result] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId), isNull(workspaces.deletedAt)))
      .limit(1);
    return result ?? null;
  },
};
