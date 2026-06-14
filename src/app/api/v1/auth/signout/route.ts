import { NextRequest, NextResponse } from 'next/server';
import { buildMeta } from '@/server/http/response';
import { authService } from '@/server/modules/auth/services/auth.service';
import { verifyRefreshToken } from '@/server/modules/auth/services/jwt.service';
import { AUTH } from '@/server/modules/auth/constants';
import { clearRefreshCookie } from '@/server/modules/auth/cookie';
import { logger } from '@/server/lib/logger';

/**
 * Signout endpoint — does NOT require a valid access token.
 * Uses the httpOnly refresh_token cookie to identify the session.
 * This ensures logout works even when the access token is expired.
 */
export async function POST(request: NextRequest) {
  logger.auth.info('signout');
  try {
    const refreshToken = request.cookies.get(AUTH.COOKIE.REFRESH_TOKEN)?.value;

    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload?.sessionId) {
        await authService.signout(payload.sessionId);
      }
    }
  } catch (e) {
    logger.auth.error('signout failed', { error: e instanceof Error ? e.message : e });
  }

  const response = NextResponse.json({
    success: true,
    message: AUTH.MESSAGES.SIGNOUT_SUCCESS,
    data: null,
    meta: buildMeta(),
  });

  clearRefreshCookie(response);
  logger.auth.info('signout completed');
  return response;
}
