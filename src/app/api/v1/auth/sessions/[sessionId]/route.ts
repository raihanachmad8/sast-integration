import type { NextRequest } from 'next/server';

import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { profileService } from '@/server/modules/profile';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revoke (delete) a specific session.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.profile.info('revokeSession');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { sessionId } = await params;

  try {
    // Don't allow revoking the current session
    if (sessionId === auth.context.sessionId) {
      return ApiResponse.error('Cannot revoke current session', 'VALIDATION_ERROR', undefined, 400);
    }

    await profileService.revokeSession(auth.context.userId, sessionId);
    logger.profile.info('revokeSession completed');
    return ApiResponse.success('Session revoked', null);
  } catch (e) {
    logger.profile.error('revokeSession failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to revoke session', 'INTERNAL_ERROR', undefined, 500);
  }
}
