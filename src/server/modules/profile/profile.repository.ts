import { eq } from 'drizzle-orm';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@/server/db/client';
import { users, sessions } from '@drizzle/schema/users';

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `avatars/${userId}.${ext}`;

    const filePath = join(process.cwd(), 'public', 'uploads', fileName);
    await writeFile(filePath, buffer);

    const avatarUrl = `/uploads/${fileName}`;

    const [updated] = await db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
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
      .where(eq(sessions.id, sessionId))
      .returning();
    return deleted ?? null;
  },
};
