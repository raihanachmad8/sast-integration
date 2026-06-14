import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { HTTP } from '@/server/http/constants';
import { verifyToken } from '@/server/modules/auth/services/jwt.service';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { AUTH } from '@/server/modules/auth/constants';

export interface AuthContext {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Extract userId from auth context.
 * Convenience helper to avoid `auth.context.userId` boilerplate.
 */
export function getUserId(context: AuthContext): string {
  return context.userId;
}

interface AuthSuccess {
  success: true;
  context: AuthContext;
}

interface AuthFailure {
  success: false;
  response: ReturnType<typeof ApiResponse.error>;
}

/**
 * Authenticate request by verifying JWT and checking session exists in DB.
 * Handles signout invalidation — if session deleted, returns 401.
 *
 * @example
 * const auth = await authenticate(request);
 * if (!auth.success) return auth.response;
 * // auth.context.userId, auth.context.sessionId available
 */
export async function authenticate(request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get(HTTP.HEADERS.AUTHORIZATION);
  const token = authHeader?.startsWith(HTTP.AUTH_SCHEME) ? authHeader.slice(HTTP.AUTH_SCHEME.length) : null;

  if (!token) {
    return { success: false, response: ApiResponse.error(AUTH.ERRORS.NO_TOKEN, AUTH.ERROR_CODE.AUTH, undefined, 401) };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { success: false, response: ApiResponse.error(AUTH.ERRORS.INVALID_TOKEN, AUTH.ERROR_CODE.AUTH, undefined, 401) };
  }

  // Session-based validation: verify session still active in DB
  const session = await authRepository.findSession(payload.sessionId);
  if (!session) {
    return { success: false, response: ApiResponse.error(AUTH.ERRORS.INVALID_SESSION, AUTH.ERROR_CODE.AUTH, undefined, 401) };
  }

  return {
    success: true,
    context: { userId: payload.sub, email: payload.email, sessionId: payload.sessionId },
  };
}
