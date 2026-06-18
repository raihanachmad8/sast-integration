import { notificationsRepository } from './notifications.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const notificationsService = {
  /**
   * List all notifications for a user, ordered by creation date descending.
   *
   * @param userId - User UUID to fetch notifications for
   * @returns Array of notification records
   * @throws {AppError} If the database query fails (500)
   */
  async list(userId: string) {
    logger.notifications.info('list', { userId });
    try {
      const result = await notificationsRepository.list(userId);
      logger.notifications.info('list completed', { count: result.length });
      return result;
    } catch (error) {
      logger.notifications.error('list failed', { userId, error });
      throw new AppError('Failed to fetch notifications', 500, 'INTERNAL_ERROR');
    }
  },

  /**
   * Get the count of unread notifications for a user.
   *
   * @param userId - User UUID to count unread notifications for
   * @returns Number of unread notifications
   * @throws {AppError} If the database query fails (500)
   */
  async getUnreadCount(userId: string) {
    logger.notifications.info('getUnreadCount', { userId });
    try {
      const count = await notificationsRepository.getUnreadCount(userId);
      logger.notifications.info('getUnreadCount completed', { count });
      return count;
    } catch (error) {
      logger.notifications.error('getUnreadCount failed', { userId, error });
      throw new AppError('Failed to fetch unread count', 500, 'INTERNAL_ERROR');
    }
  },
};
