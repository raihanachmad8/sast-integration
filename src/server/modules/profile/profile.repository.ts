import { eq, and } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { users, sessions } from '@drizzle/schema/users';

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface ProfileView {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  username: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface ProfileRepository {
  get(userId: string): Promise<ProfileView | null>;
  update(userId: string, data: UpdateProfileInput, tx?: Tx): Promise<ProfileView | null>;
  setAvatarUrl(userId: string, avatarUrl: string | null, tx?: Tx): Promise<ProfileView | null>;
  listSessions(userId: string): Promise<{ id: string; userId: string; ipAddress: string | null; userAgent: string | null; lastActivity: Date; createdAt: Date }[]>;
  deleteSession(userId: string, sessionId: string): Promise<boolean>;
}

export const profileRepository: ProfileRepository = {
  async get(userId: string) {
    logger.profile.info('get', { userId });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    logger.profile.info('get completed', { userId, found: !!user });
    return user ?? null;
  },

  async update(userId: string, data: UpdateProfileInput, tx?: Tx) {
    logger.profile.info('update', { userId });
    const executor = tx ?? db;
    const [updated] = await executor
      .update(users)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.language !== undefined && { language: data.language }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    logger.profile.info('update completed', { userId });
    return updated ?? null;
  },

  async setAvatarUrl(userId: string, avatarUrl: string | null, tx?: Tx) {
    logger.profile.info('setAvatarUrl', { userId });
    const executor = tx ?? db;
    const [updated] = await executor
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    logger.profile.info('setAvatarUrl completed', { userId });
    return updated ?? null;
  },

  async listSessions(userId: string) {
    logger.profile.info('listSessions', { userId });
    const rows = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        lastActivity: sessions.lastActivity,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId));
    logger.profile.info('listSessions completed', { userId, count: rows.length });
    return rows;
  },

  async deleteSession(userId: string, sessionId: string) {
    logger.profile.info('deleteSession', { userId, sessionId });
    const [deleted] = await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .returning();
    const result = !!deleted;
    logger.profile.info('deleteSession completed', { userId, sessionId, deleted: result });
    return result;
  },
};
