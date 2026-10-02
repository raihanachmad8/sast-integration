import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';

/**
 * GET /api/v1/auth/sessions
 * List active sessions for the current user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    // TODO: Implement session listing from database
    // For now return the current session
    return ApiResponse.success('Sessions retrieved', [
      {
        id: 'current',
        device: 'Current Browser',
        location: 'Localhost',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isCurrent: true,
      },
    ]);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
