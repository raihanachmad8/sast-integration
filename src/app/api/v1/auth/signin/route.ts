import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, buildMeta } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { signinSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH, NODE_ENV } from '@/server/modules/auth/constants';
import { HTTP } from '@/server/http/constants';
import { env } from '@/server/env';

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, signinSchema);
  if (!validation.success) return validation.response;

  try {
    const ip = request.headers.get(HTTP.HEADERS.FORWARDED_FOR) ?? undefined;
    const userAgent = request.headers.get(HTTP.HEADERS.USER_AGENT) ?? undefined;
    const result = await authService.signin(validation.data, { ip, userAgent });

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

    response.cookies.set(AUTH.COOKIE.REFRESH_TOKEN, result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === NODE_ENV.PRODUCTION,
      sameSite: 'lax',
      path: AUTH.COOKIE.PATH,
      maxAge: AUTH.COOKIE.MAX_AGE,
    });

    return response;
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
