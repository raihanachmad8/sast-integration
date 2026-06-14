import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { signinSchema } from '@/server/modules/auth/schemas/auth.schema';
import { rateLimiter } from '@/server/modules/auth/services/rate-limiter';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { setRefreshCookie } from '@/server/modules/auth/cookie';
import { HTTP } from '@/server/http/constants';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest) {
  logger.auth.info('signin');
  const validation = await validateBody(request, signinSchema);
  if (!validation.success) return validation.response;

  const rateLimitKey = validation.data.email.toLowerCase();
  const retryAfterMs = rateLimiter.check(rateLimitKey);
  if (retryAfterMs !== null) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { success: false, message: AUTH.ERRORS.RATE_LIMITED, data: null, meta: buildMeta(), error: { code: AUTH.ERROR_CODE.AUTH, details: null } },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  try {
    const ip = request.headers.get(HTTP.HEADERS.FORWARDED_FOR) ?? undefined;
    const userAgent = request.headers.get(HTTP.HEADERS.USER_AGENT) ?? undefined;
    const result = await authService.signin(validation.data, { ip, userAgent });

    rateLimiter.reset(rateLimitKey);

    const response = NextResponse.json({
      success: true,
      message: AUTH.MESSAGES.SIGNIN_SUCCESS,
      data: {
        tokenType: result.tokenType,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        expiresIn: result.expiresIn,
        user: result.user,
        workspace: result.workspace,
      },
      meta: buildMeta(),
    });

    setRefreshCookie(response, result.refreshToken);
    logger.auth.info('signin completed');
    return response;
  } catch (e) {
    logger.auth.error('signin failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError && e.statusCode === 401) {
      rateLimiter.recordFailure(rateLimitKey);
    }
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
