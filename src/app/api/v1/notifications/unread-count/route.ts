import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { notificationsService } from '@/server/modules/notifications/notifications.service';

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count for the current user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    // Use notificationsService instead of direct DB query
    const count = await notificationsService.getUnreadCount(auth.context.userId);

    return ApiResponse.success('Unread count retrieved', { count });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get unread count', 'INTERNAL_ERROR', undefined, 500);
  }
}
