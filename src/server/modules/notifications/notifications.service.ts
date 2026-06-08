import { notificationsRepository } from './notifications.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const notificationsService = {
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
