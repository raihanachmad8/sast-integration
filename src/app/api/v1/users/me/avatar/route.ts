import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { profileService } from '@/server/modules/profile';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';

/**
 * POST /api/v1/users/me/avatar
 * Upload a new avatar image for the current user.
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(request: NextRequest) {
  logger.profile.info('uploadAvatar: received request');
  const auth = await authenticate(request);
  if (!auth.success) {
    logger.profile.warn('uploadAvatar: auth failed');
    return auth.response;
  }

  const userId = getUserId(auth.context);
  if (!userId) {
    logger.profile.warn('uploadAvatar: no userId in auth context');
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      logger.profile.warn('uploadAvatar: no file in formData', { fields: [...formData.keys()] });
      return ApiResponse.error('No file provided', 'VALIDATION_ERROR', undefined, 400);
    }

    logger.profile.info('uploadAvatar: file received', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId,
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (file.type && !allowedTypes.includes(file.type)) {
      logger.profile.warn('uploadAvatar: invalid file type', { fileType: file.type, allowedTypes });
      return ApiResponse.error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP', 'VALIDATION_ERROR', undefined, 400);
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      logger.profile.warn('uploadAvatar: file too large', { fileSize: file.size, maxSize });
      return ApiResponse.error('File too large. Maximum size: 2MB', 'VALIDATION_ERROR', undefined, 400);
    }

    logger.profile.info('uploadAvatar: validation passed, calling service', { userId, fileType: file.type, fileSize: file.size });
    const { avatarUrl } = await profileService.uploadAvatar(userId, file);
    logger.profile.info('uploadAvatar completed', { userId, avatarUrl });
    return ApiResponse.success('Avatar uploaded', { avatarUrl });
  } catch (e) {
    const errDetail = e instanceof Error ? { message: e.message, name: e.name, stack: e.stack } : { raw: String(e) };
    logger.profile.error('uploadAvatar failed', { userId, error: errDetail });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to upload avatar', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/users/me/avatar
 * Remove the current user's avatar.
 */
export async function DELETE(request: NextRequest) {
  logger.profile.info('removeAvatar');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    await profileService.removeAvatar(userId);
    logger.profile.info('removeAvatar completed');
    return ApiResponse.success('Avatar removed', { avatarUrl: null });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    logger.profile.error('removeAvatar failed', { error: e instanceof Error ? e.message : e });
    return ApiResponse.error('Failed to remove avatar', 'INTERNAL_ERROR', undefined, 500);
  }
}
