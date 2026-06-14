import { eq, and } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { db } from '@/server/db/client';
import { users, sessions } from '@drizzle/schema/users';
import { AUTH } from '@/server/modules/auth/constants';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export const profileRepository = {
  async get(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  },

  async update(userId: string, data: UpdateProfileInput) {
    const [updated] = await db
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
    return updated ?? null;
  },

  async uploadAvatar(userId: string, file: File) {
    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new AppError('File size exceeds 5MB limit', 400, 'VALIDATION_ERROR');
    }

    // Validate MIME type
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new AppError('Invalid file type. Allowed: PNG, JPEG, GIF, WebP', 400, 'VALIDATION_ERROR');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'png';
    const key = `avatars/${userId}.${ext}`;

    const storage = await getStorageDriver();
    const result = await storage.upload(buffer, key, { contentType: file.type || 'image/png' });

    const [updated] = await db
      .update(users)
      .set({ avatarUrl: result.url, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updated?.avatarUrl ?? null;
  },

  async removeAvatar(userId: string) {
    const [updated] = await db
      .update(users)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return updated ?? null;
  },

  async listSessions(userId: string) {
    return db
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
  },

  async deleteSession(userId: string, sessionId: string) {
    const [deleted] = await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .returning();
    return deleted ?? null;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return false;

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) return false;

    const newHash = await hash(newPassword, AUTH.SALT_ROUNDS);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return true;
  },
};
