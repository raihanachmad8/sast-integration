import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { schedulesService } from '@/server/modules/schedules';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; scheduleId: string }> };

/**
 * PUT /api/v1/workspaces/:workspaceId/schedules/:scheduleId/toggle
 * Toggle schedule enabled/disabled.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('put request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const schedule = await schedulesService.toggle(scheduleId, workspaceId, auth.context.userId);
    return ApiResponse.success('Schedule toggled', schedule);
  } catch (error) {
    logger.scan.error('toggleSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
