import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { db } from '@/server/db/client';
import { sessions } from '@drizzle/schema/users';
import { eq, and } from 'drizzle-orm';

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * Revoke (delete) a specific session.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { sessionId } = await params;

  try {
    // Only allow users to revoke their own sessions
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, auth.context.userId)))
      .limit(1);

    if (!session) {
      return ApiResponse.error('Session not found', 'NOT_FOUND', undefined, 404);
    }

    // Don't allow revoking the current session
    const currentSessionId = auth.context.sessionId;
    if (sessionId === currentSessionId) {
      return ApiResponse.error('Cannot revoke current session', 'VALIDATION_ERROR', undefined, 400);
    }

    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return ApiResponse.success('Session revoked', null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to revoke session', 'INTERNAL_ERROR', undefined, 500);
  }
}
