import { NextRequest, NextResponse } from 'next/server';
import { buildMeta } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { AUTH } from '@/server/modules/auth/constants';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  await authService.signout(auth.context.sessionId);

  const response = NextResponse.json({ success: true, message: AUTH.MESSAGES.SIGNOUT_SUCCESS, data: null, meta: buildMeta() });
  response.cookies.delete(AUTH.COOKIE.REFRESH_TOKEN);
  return response;
}
