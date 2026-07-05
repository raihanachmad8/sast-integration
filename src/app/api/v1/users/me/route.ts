import { NextRequest } from 'next/server';

import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { profileService } from '@/server/modules/profile';

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
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
