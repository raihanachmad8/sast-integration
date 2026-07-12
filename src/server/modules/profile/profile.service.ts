import { hash, compare } from 'bcryptjs';

import type { ProfileUpdateInput } from '@/commons/schemas/profile.schema';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { AUTH } from '@/server/modules/auth/constants';
import { getStorageDriver } from '@/server/modules/storage/storage.service';

import { profileRepository } from './profile.repository';

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

  async update(userId: string, data: ProfileUpdateInput) {
    logger.profile.info('update', { userId });
    const updated = await profileRepository.update(userId, data);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('update completed', { userId });
    return updated;
  },

  async uploadAvatar(userId: string, file: File) {
    logger.profile.info('uploadAvatar', { userId, fileName: file.name });

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new AppError('File size exceeds 5MB limit', 400, 'VALIDATION_ERROR');
    }

    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new AppError('Invalid file type. Allowed: PNG, JPEG, GIF, WebP', 400, 'VALIDATION_ERROR');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'png';
    const key = `avatars/${userId}.${ext}`;

    const storage = await getStorageDriver();
    const result = await storage.upload(buffer, key, { contentType: file.type || 'image/png' });

    const updated = await profileRepository.setAvatarUrl(userId, result.url);
    if (!updated) {
      throw new AppError('Failed to upload avatar', 500, 'INTERNAL_ERROR');
    }

    logger.profile.info('uploadAvatar completed', { userId, avatarUrl: result.url });
    return { avatarUrl: result.url };
  },

  async removeAvatar(userId: string) {
    logger.profile.info('removeAvatar', { userId });
    const updated = await profileRepository.setAvatarUrl(userId, null);
    if (!updated) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    logger.profile.info('removeAvatar completed', { userId });
    return { avatarUrl: null };
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

    const passwordHash = await profileRepository.getPasswordHash(userId);
    if (!passwordHash) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const valid = await compare(currentPassword, passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400, 'VALIDATION_ERROR');
    }

    const newHash = await hash(newPassword, AUTH.SALT_ROUNDS);
    await profileRepository.updatePassword(userId, newHash);

    logger.profile.info('changePassword completed', { userId });
  },
};
