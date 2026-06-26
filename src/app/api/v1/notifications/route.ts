import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { notificationsService } from '@/server/modules/notifications/notifications.service';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/notifications
 * List notifications for the current user (using activity_logs as notification source).
 */
export async function GET(request: NextRequest) {
  logger.notifications.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    // Use notificationsService instead of direct DB query
    const notifications = await notificationsService.list(auth.context.userId);

    return ApiResponse.success('Notifications retrieved', notifications);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get notifications', 'INTERNAL_ERROR', undefined, 500);
  }
}
