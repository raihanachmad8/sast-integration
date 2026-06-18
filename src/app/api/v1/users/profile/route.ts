import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { profileService } from '@/server/modules/profile';
import { logger } from '@/server/lib/logger';
import { z } from 'zod';
import { AppError } from '@/server/http/errors';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional().default(''),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

/**
 * GET /api/v1/users/profile
 * Get the current user's profile.
 */
export async function GET(request: NextRequest) {
  logger.profile.info('getProfile');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  try {
    const user = await profileService.get(userId);
    logger.profile.info('getProfile completed');
    return ApiResponse.success('Profile retrieved', user);
  } catch (e) {
    logger.profile.error('getProfile failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get profile', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/users/profile
 * Update the current user's profile.
 */
export async function PUT(request: NextRequest) {
  logger.profile.info('updateProfile');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const validation = await validateBody(request, updateProfileSchema);
  if (!validation.success) return validation.response;

  try {
    const updated = await profileService.update(userId, validation.data);

    logger.profile.info('updateProfile completed');
    return ApiResponse.success('Profile updated', {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      bio: updated.bio,
      timezone: updated.timezone,
      language: updated.language,
      avatarUrl: updated.avatarUrl,
    });
  } catch (e) {
    logger.profile.error('updateProfile failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update profile', 'INTERNAL_ERROR', undefined, 500);
  }
}
