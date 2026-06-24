import { eq, and } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { db } from '@/server/db/client';
import { users, sessions } from '@drizzle/schema/users';
import { AUTH } from '@/server/modules/auth/constants';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export const profileRepository = {
  /**
   * Get a user profile by user ID.
   * @param userId - User UUID
   * @returns User record or null if not found
   */
  async get(userId: string) {
    logger.profile.debug('get called', { userId });
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  },

  /**
   * Update a user's profile fields.
   * @param userId - User UUID
   * @param data - Profile fields to update (name, username, bio, timezone, language)
   * @returns Updated user record or null if not found
   */
  async update(userId: string, data: UpdateProfileInput) {
    logger.profile.debug('update called', { userId });
    try {
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
    } catch (error) {
      logger.profile.error('update failed', { error });
      throw error;
    }
  },

  /**
   * Upload and set a user's avatar image.
   * @param userId - User UUID
   * @param file - Image file to upload (max 5MB, PNG/JPEG/GIF/WebP)
   * @returns The avatar URL or null on failure
   * @throws {AppError} 400 - File size exceeds 5MB limit or invalid file type
   */
  async uploadAvatar(userId: string, file: File) {
    logger.profile.debug('uploadAvatar called', { userId });
    try {
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
    } catch (error) {
      logger.profile.error('uploadAvatar failed', { error });
      throw error;
    }
  },

  /**
   * Remove a user's avatar by setting avatarUrl to null.
   * @param userId - User UUID
   * @returns Updated user record or null if not found
   */
  async removeAvatar(userId: string) {
    logger.profile.debug('removeAvatar called', { userId });
    try {
      const [updated] = await db
        .update(users)
        .set({ avatarUrl: null, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      return updated ?? null;
    } catch (error) {
      logger.profile.error('removeAvatar failed', { error });
      throw error;
    }
  },

  /**
   * List all sessions for a user.
   * @param userId - User UUID
   * @returns Array of session records with id, ipAddress, userAgent, lastActivity, and createdAt
   */
  async listSessions(userId: string) {
    logger.profile.debug('listSessions called', { userId });
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

  /**
   * Delete a specific session for a user.
   * @param userId - User UUID (for scoping)
   * @param sessionId - Session UUID to delete
   * @returns Deleted session record or null if not found
   */
  async deleteSession(userId: string, sessionId: string) {
    logger.profile.debug('deleteSession called', { userId, sessionId });
    try {
      const [deleted] = await db
        .delete(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
        .returning();
      return deleted ?? null;
    } catch (error) {
      logger.profile.error('deleteSession failed', { error });
      throw error;
    }
  },

  /**
   * Change a user's password after verifying the current password.
   * @param userId - User UUID
   * @param currentPassword - Current plaintext password for verification
   * @param newPassword - New plaintext password to hash and store
   * @returns true if password was changed, false if current password is invalid or user not found
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    logger.profile.debug('changePassword called', { userId });
    try {
      return db.transaction(async (tx) => {
        const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) return false;

        const valid = await compare(currentPassword, user.passwordHash);
        if (!valid) return false;

        const newHash = await hash(newPassword, AUTH.SALT_ROUNDS);
        await tx.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
        return true;
      });
    } catch (error) {
      logger.profile.error('changePassword failed', { error });
      throw error;
    }
  },
};
