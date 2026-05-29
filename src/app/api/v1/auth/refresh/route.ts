import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';
import { authService } from '@/server/modules/auth/services/auth.service';
import { verifyToken } from '@/server/modules/auth/services/jwt.service';
import { AUTH, NODE_ENV } from '@/server/modules/auth/constants';
import { env } from '@/server/env';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(AUTH.COOKIE.REFRESH_TOKEN)?.value;
    if (!refreshToken) return ApiResponse.error(AUTH.ERRORS.NO_TOKEN, AUTH.ERROR_CODE.AUTH, undefined, 401);

    const payload = await verifyToken(refreshToken);
    if (!payload || !payload.sessionId) return ApiResponse.error(AUTH.ERRORS.INVALID_TOKEN, AUTH.ERROR_CODE.AUTH, undefined, 401);

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

    response.cookies.set(AUTH.COOKIE.REFRESH_TOKEN, result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === NODE_ENV.PRODUCTION,
      sameSite: 'lax',
      path: AUTH.COOKIE.PATH,
      maxAge: AUTH.COOKIE.MAX_AGE,
    });

    return response;
  } catch {
    return ApiResponse.error(AUTH.ERRORS.INVALID_TOKEN, AUTH.ERROR_CODE.AUTH, undefined, 401);
  }
}
