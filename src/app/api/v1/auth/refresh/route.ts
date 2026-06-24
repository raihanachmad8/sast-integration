import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authService } from '@/server/modules/auth/services/auth.service';
import { verifyRefreshToken } from '@/server/modules/auth/services/jwt.service';
import { AUTH } from '@/server/modules/auth/constants';
import { setRefreshCookie, clearRefreshCookie } from '@/server/modules/auth/cookie';
import { logger } from '@/server/lib/logger';

/**
 * Returns a 401 response and clears the refresh cookie.
 * Used for all authentication failures on the refresh endpoint.
 */
function unauthorizedRefresh(message: string = AUTH.ERRORS.INVALID_TOKEN) {
  const response = ApiResponse.error(message, AUTH.ERROR_CODE.AUTH, undefined, 401);
  clearRefreshCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  logger.auth.info('refresh');
  try {
    // CSRF protection for the cookie-only refresh endpoint.
    // The client must send the custom header defined in AUTH.REFRESH.
    // Browsers will not send this header during a simple cross-site request.
    const hasRefreshHeader =
      request.headers.get(AUTH.REFRESH.CSRF_HEADER) === AUTH.REFRESH.CSRF_HEADER_VALUE;

    if (!hasRefreshHeader) {
      return unauthorizedRefresh('Invalid refresh request');
    }

    const refreshToken = request.cookies.get(AUTH.COOKIE.REFRESH_TOKEN)?.value;
    if (!refreshToken) return unauthorizedRefresh(AUTH.ERRORS.NO_TOKEN);

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload || !payload.sessionId || !payload.refreshTokenId) return unauthorizedRefresh();

    const result = await authService.refresh(payload.sessionId, payload.refreshTokenId);

    const response = ApiResponse.success(AUTH.MESSAGES.REFRESH_SUCCESS, {
      tokenType: result.tokenType,
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      expiresIn: result.expiresIn,
    });

    setRefreshCookie(response, result.refreshToken);

    logger.auth.info('refresh completed');
    return response;
  } catch (e) {
    logger.auth.error('refresh failed', { error: e instanceof Error ? e.message : e });
    return unauthorizedRefresh();
  }
}
