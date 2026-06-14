import { profileRepository, type UpdateProfileInput } from './profile.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const profileService = {
  async get(userId: string) {
    logger.profile.info('get', { userId });
    const user = await profileRepository.get(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('get completed', { userId });
    return user;
  },

  async update(userId: string, data: UpdateProfileInput) {
    logger.profile.info('update', { userId });
    const updated = await profileRepository.update(userId, data);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('update completed', { userId });
    return updated;
  },

  async uploadAvatar(userId: string, file: File) {
    logger.profile.info('uploadAvatar', { userId });
    const avatarUrl = await profileRepository.uploadAvatar(userId, file);
    if (!avatarUrl) {
      throw new AppError('Failed to upload avatar', 500, 'INTERNAL_ERROR');
    }
    logger.profile.info('uploadAvatar completed', { userId });
    return { avatarUrl };
  },

  async removeAvatar(userId: string) {
    logger.profile.info('removeAvatar', { userId });
    const updated = await profileRepository.removeAvatar(userId);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('removeAvatar completed', { userId });
    return { avatarUrl: null as string | null };
  },

  async getSessions(userId: string) {
    logger.profile.info('getSessions', { userId });
    const sessions = await profileRepository.listSessions(userId);
    logger.profile.info('getSessions completed', { count: sessions.length });
    return { sessions };
  },

  async revokeSession(userId: string, sessionId: string) {
    logger.profile.info('revokeSession', { userId, sessionId });
    const deleted = await profileRepository.deleteSession(userId, sessionId);
    if (!deleted) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('revokeSession completed', { sessionId });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    logger.profile.info('changePassword', { userId });
    const success = await profileRepository.changePassword(userId, currentPassword, newPassword);
    if (!success) {
      throw new AppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }
    logger.profile.info('changePassword completed', { userId });
  },
};
