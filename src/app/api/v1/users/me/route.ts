import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { profileService } from '@/server/modules/profile';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  logger.profile.info('getProfile');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const user = await profileService.get(auth.context.userId);
    logger.profile.info('getProfile completed');
    return ApiResponse.success('Profile retrieved', user);
  } catch (e) {
    logger.profile.error('getProfile failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
