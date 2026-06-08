import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { profileService } from '@/server/modules/profile';
import { logger } from '@/server/lib/logger';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

/**
 * PUT /api/v1/users/profile
 * Update the current user's profile.
 */
export async function PUT(request: NextRequest) {
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
    logger.profile.error('update failed', { error: e });
    return ApiResponse.error('Failed to update profile', 'INTERNAL_ERROR', undefined, 500);
  }
}
