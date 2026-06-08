import { NextRequest, NextResponse } from 'next/server';
import { buildMeta } from '@/server/http/response';
import { authService } from '@/server/modules/auth/services/auth.service';
import { verifyRefreshToken } from '@/server/modules/auth/services/jwt.service';
import { AUTH } from '@/server/modules/auth/constants';
import { clearRefreshCookie } from '@/server/modules/auth/cookie';

/**
 * Signout endpoint — does NOT require a valid access token.
 * Uses the httpOnly refresh_token cookie to identify the session.
 * This ensures logout works even when the access token is expired.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(AUTH.COOKIE.REFRESH_TOKEN)?.value;

    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload?.sessionId) {
        await authService.signout(payload.sessionId);
      }
    }
  } catch {
    // Even if signout fails, clear the cookie so the user is logged out client-side
  }

  const response = NextResponse.json({
    success: true,
    message: AUTH.MESSAGES.SIGNOUT_SUCCESS,
    data: null,
    meta: buildMeta(),
  });

  clearRefreshCookie(response);
  return response;
}
