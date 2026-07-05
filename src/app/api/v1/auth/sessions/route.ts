import type { NextRequest } from 'next/server';

import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { profileService } from '@/server/modules/profile';

/**
 * GET /api/v1/auth/sessions
 * List active sessions for the current user.
 */
export async function GET(request: NextRequest) {
  logger.profile.info('listSessions');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const result = await profileService.getSessions(auth.context.userId);
    logger.profile.info('listSessions completed');
    return ApiResponse.success('Sessions retrieved', result.sessions);
  } catch (e) {
    logger.profile.error('listSessions failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
