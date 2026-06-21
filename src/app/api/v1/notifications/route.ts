import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { db } from '@/server/db/client';
import { activityLogs } from '@drizzle/schema/integrations';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/v1/notifications
 * List notifications for the current user (using activity_logs as notification source).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const notifications = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, auth.context.userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return ApiResponse.success('Notifications retrieved', notifications);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get notifications', 'INTERNAL_ERROR', undefined, 500);
  }
}
