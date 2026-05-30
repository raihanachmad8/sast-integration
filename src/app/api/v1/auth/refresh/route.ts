import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';
import { authService } from '@/server/modules/auth/services/auth.service';
import { verifyToken } from '@/server/modules/auth/services/jwt.service';
import { AUTH } from '@/server/modules/auth/constants';
import { setRefreshCookie, clearRefreshCookie } from '@/server/modules/auth/cookie';

function unauthorizedRefresh(message: string = AUTH.ERRORS.INVALID_TOKEN) {
  const response = ApiResponse.error(message, AUTH.ERROR_CODE.AUTH, undefined, 401);
  clearRefreshCookie(response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(AUTH.COOKIE.REFRESH_TOKEN)?.value;
    if (!refreshToken) return unauthorizedRefresh(AUTH.ERRORS.NO_TOKEN);

    const payload = await verifyToken(refreshToken);
    if (!payload || !payload.sessionId) return unauthorizedRefresh();

    const result = await authService.refresh(payload.sessionId);

    const response = NextResponse.json({
      success: true,
      message: AUTH.MESSAGES.REFRESH_SUCCESS,
      data: {
        tokenType: result.tokenType,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        expiresIn: result.expiresIn,
      },
      meta: buildMeta(),
    });

    setRefreshCookie(response, result.refreshToken);

    return response;
  } catch {
    return unauthorizedRefresh();
  }
}
