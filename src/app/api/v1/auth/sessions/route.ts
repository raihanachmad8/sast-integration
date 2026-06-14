import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { profileService } from '@/server/modules/profile';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/auth/sessions
 * List active sessions for the current user.
 */
export async function GET(request: NextRequest) {
  logger.auth.info('sessions');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const result = await profileService.getSessions(auth.context.userId);
    logger.auth.info('sessions completed');
    return ApiResponse.success('Sessions retrieved', result.sessions);
  } catch (e) {
    logger.auth.error('sessions failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
