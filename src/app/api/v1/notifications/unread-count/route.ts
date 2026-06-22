import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { db } from '@/server/db/client';
import { activityLogs } from '@drizzle/schema/integrations';
import { eq, count } from 'drizzle-orm';

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count for the current user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    // For now, return total count as "unread" since we don't have a read/unread tracking
    const [{ total }] = await db
      .select({ total: count() })
      .from(activityLogs)
      .where(eq(activityLogs.userId, auth.context.userId));

    return ApiResponse.success('Unread count retrieved', { count: total });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get unread count', 'INTERNAL_ERROR', undefined, 500);
  }
}
