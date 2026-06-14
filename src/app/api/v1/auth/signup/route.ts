import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { signupSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { rateLimiter } from '@/server/modules/auth/services/rate-limiter';
import { HTTP } from '@/server/http/constants';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest) {
  logger.auth.info('signup');
  const validation = await validateBody(request, signupSchema);
  if (!validation.success) return validation.response;

  const ip = request.headers.get(HTTP.HEADERS.FORWARDED_FOR) ?? 'unknown';
  const retryAfterMs = rateLimiter.check(`signup:${ip}`);
  if (retryAfterMs !== null) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { success: false, message: AUTH.ERRORS.RATE_LIMITED, data: null, meta: buildMeta(), error: { code: AUTH.ERROR_CODE.AUTH, details: null } },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  try {
    const user = await authService.signup(validation.data);
    logger.auth.info('signup completed');
    return ApiResponse.success(AUTH.MESSAGES.SIGNUP_SUCCESS, user);
  } catch (e) {
    logger.auth.error('signup failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError && e.statusCode === 403) {
      rateLimiter.recordFailure(`signup:${ip}`);
    }
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
