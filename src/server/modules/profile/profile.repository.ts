import { eq, and } from 'drizzle-orm';

import type { ProfileUpdateInput } from '@/commons/schemas/profile.schema';
import type { ProfileView, SessionView } from '@/commons/types/profile';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { users, sessions } from '@drizzle/schema/users';

export interface ProfileRepository {
  get(userId: string): Promise<ProfileView | null>;
  getPasswordHash(userId: string): Promise<string | null>;
  update(userId: string, data: ProfileUpdateInput, tx?: Tx): Promise<ProfileView | null>;
  setAvatarUrl(userId: string, avatarUrl: string | null, tx?: Tx): Promise<ProfileView | null>;
  updatePassword(userId: string, hashedPassword: string, tx?: Tx): Promise<void>;
  listSessions(userId: string): Promise<SessionView[]>;
  deleteSession(userId: string, sessionId: string): Promise<boolean>;
}

export const profileRepository: ProfileRepository = {
  async get(userId: string) {
    logger.profile.info('get', { userId });
    const executor = db;
    const [user] = await executor.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      logger.profile.info('get completed', { userId, found: false });
      return null;
    }
    const data: ProfileView = {
      ...user,
      avatarUrl: user.avatarUrl ?? null,
      username: user.username ?? null,
      bio: user.bio ?? null,
      timezone: user.timezone ?? null,
      language: user.language ?? null,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
    logger.profile.info('get completed', { userId, found: true });
    return data;
  },

  async getPasswordHash(userId: string) {
    logger.profile.info('getPasswordHash', { userId });
    const executor = db;
    const [user] = await executor
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    logger.profile.info('getPasswordHash completed', { userId, found: !!user });
    return user?.passwordHash ?? null;
  },

  async update(userId: string, data: ProfileUpdateInput, tx?: Tx) {
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
    if (!updated) {
      logger.profile.info('update completed', { userId, found: false });
      return null;
    }
    const result: ProfileView = {
      ...updated,
      avatarUrl: updated.avatarUrl ?? null,
      username: updated.username ?? null,
      bio: updated.bio ?? null,
      timezone: updated.timezone ?? null,
      language: updated.language ?? null,
      emailVerifiedAt: updated.emailVerifiedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
    logger.profile.info('update completed', { userId, found: true });
    return result;
  },

  async setAvatarUrl(userId: string, avatarUrl: string | null, tx?: Tx) {
    logger.profile.info('setAvatarUrl', { userId });
    const executor = tx ?? db;
    const [updated] = await executor
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) {
      logger.profile.info('setAvatarUrl completed', { userId, found: false });
      return null;
    }
    const result: ProfileView = {
      ...updated,
      avatarUrl: updated.avatarUrl ?? null,
      username: updated.username ?? null,
      bio: updated.bio ?? null,
      timezone: updated.timezone ?? null,
      language: updated.language ?? null,
      emailVerifiedAt: updated.emailVerifiedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
    logger.profile.info('setAvatarUrl completed', { userId, found: true });
    return result;
  },

  async updatePassword(userId: string, hashedPassword: string, tx?: Tx) {
    logger.profile.info('updatePassword', { userId });
    const executor = tx ?? db;
    await executor
      .update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
    logger.profile.info('updatePassword completed', { userId });
  },

  async listSessions(userId: string) {
    logger.profile.info('listSessions', { userId });
    const executor = db;
    const rows = await executor
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
    const data: SessionView[] = rows.map((row) => ({
      ...row,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      lastActivity: row.lastActivity.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
    logger.profile.info('listSessions completed', { userId, count: data.length });
    return data;
  },

  async deleteSession(userId: string, sessionId: string) {
    logger.profile.info('deleteSession', { userId, sessionId });
    const executor = db;
    const [deleted] = await executor
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .returning();
    const result = !!deleted;
    logger.profile.info('deleteSession completed', { userId, sessionId, deleted: result });
    return result;
  },
};
