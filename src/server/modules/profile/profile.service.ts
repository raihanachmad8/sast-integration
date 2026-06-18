import { profileRepository, type UpdateProfileInput } from './profile.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const profileService = {
  /**
   * Retrieve a user profile by user ID.
   *
   * @param userId - User UUID to fetch the profile for
   * @returns User profile record
   * @throws {AppError} If the user is not found (404)
   */
  async get(userId: string) {
    logger.profile.info('get', { userId });
    const user = await profileRepository.get(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('get completed', { userId });
    return user;
  },

  /**
   * Update a user profile with new data.
   *
   * @param userId - User UUID to update the profile for
   * @param data - Partial profile fields to update
   * @returns Updated user profile record
   * @throws {AppError} If the user is not found (404)
   */
  async update(userId: string, data: UpdateProfileInput) {
    logger.profile.info('update', { userId });
    const updated = await profileRepository.update(userId, data);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('update completed', { userId });
    return updated;
  },

  /**
   * Upload and set a user's avatar image.
   *
   * @param userId - User UUID to upload the avatar for
   * @param file - Avatar image file to upload
   * @returns Object containing the avatarUrl
   * @throws {AppError} If the upload fails (500)
   */
  async uploadAvatar(userId: string, file: File) {
    logger.profile.info('uploadAvatar', { userId });
    const avatarUrl = await profileRepository.uploadAvatar(userId, file);
    if (!avatarUrl) {
      throw new AppError('Failed to upload avatar', 500, 'INTERNAL_ERROR');
    }
    logger.profile.info('uploadAvatar completed', { userId });
    return { avatarUrl };
  },

  /**
   * Remove a user's avatar image.
   *
   * @param userId - User UUID to remove the avatar for
   * @returns Object with avatarUrl set to null
   * @throws {AppError} If the user is not found (404)
   */
  async removeAvatar(userId: string) {
    logger.profile.info('removeAvatar', { userId });
    const updated = await profileRepository.removeAvatar(userId);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('removeAvatar completed', { userId });
    return { avatarUrl: null as string | null };
  },

  /**
   * List all active sessions for a user.
   *
   * @param userId - User UUID to list sessions for
   * @returns Object containing an array of session records
   */
  async getSessions(userId: string) {
    logger.profile.info('getSessions', { userId });
    const sessions = await profileRepository.listSessions(userId);
    logger.profile.info('getSessions completed', { count: sessions.length });
    return { sessions };
  },

  /**
   * Revoke (delete) a specific session for a user.
   *
   * @param userId - User UUID who owns the session
   * @param sessionId - Session UUID to revoke
   * @throws {AppError} If the session is not found (404)
   */
  async revokeSession(userId: string, sessionId: string) {
    logger.profile.info('revokeSession', { userId, sessionId });
    const deleted = await profileRepository.deleteSession(userId, sessionId);
    if (!deleted) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('revokeSession completed', { sessionId });
  },

  /**
   * Change a user's password after verifying the current password.
   *
   * @param userId - User UUID to change the password for
   * @param currentPassword - The user's current password for verification
   * @param newPassword - The new password to set
   * @throws {AppError} If the current password is incorrect (400)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    logger.profile.info('changePassword', { userId });
    const success = await profileRepository.changePassword(userId, currentPassword, newPassword);
    if (!success) {
      throw new AppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }
    logger.profile.info('changePassword completed', { userId });
  },
};
