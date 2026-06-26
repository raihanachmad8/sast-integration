import { eq, and, isNull, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { notifications } from '@drizzle/schema/auth';
import { logger } from '@/server/lib/logger';
export const notificationsRepository = {
  /**
   * List all notifications for a user, ordered by unread first then by creation date.
   * @param userId - User UUID
   * @returns Array of notification records
   */
  async list(userId: string) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(isNull(notifications.readAt), notifications.createdAt);
  },

  /**
   * Get the count of unread notifications for a user.
   * @param userId - User UUID
   * @returns Number of unread notifications
   */
  async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return Number(result?.count ?? 0);
  },
};
