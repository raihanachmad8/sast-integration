import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';
import { logger } from '@/server/lib/logger';
import { rateLimiter } from '@/server/modules/auth/services/rate-limiter';

export async function GET(request: NextRequest) {
  logger.auth.info('verifyEmail');
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return ApiResponse.error('Token required', MAIL.ERROR_CODE, undefined, 400);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimitKey = `verify-email:${ip}`;
  const retryAfterMs = rateLimiter.check(rateLimitKey);
  if (retryAfterMs !== null) {
    return ApiResponse.error('Too many requests, try again later', 'RATE_LIMITED', undefined, 429);
  }

  try {
    await authFlowsService.verifyEmail(token);
    logger.auth.info('verifyEmail completed');
    return ApiResponse.success(MAIL.MESSAGES.VERIFY_SUCCESS, null);
  } catch (e) {
    logger.auth.error('verifyEmail failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
