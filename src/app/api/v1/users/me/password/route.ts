import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { profileService } from '@/server/modules/profile';
import { z } from 'zod';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function PUT(request: NextRequest) {
  logger.profile.info('changePassword');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const validation = await validateBody(request, changePasswordSchema);
  if (!validation.success) return validation.response;

  try {
    await profileService.changePassword(userId, validation.data.currentPassword, validation.data.newPassword);
    logger.profile.info('changePassword completed');
    return ApiResponse.success('Password updated', null);
  } catch (e) {
    logger.profile.error('changePassword failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to change password', 'INTERNAL_ERROR', undefined, 500);
  }
}
