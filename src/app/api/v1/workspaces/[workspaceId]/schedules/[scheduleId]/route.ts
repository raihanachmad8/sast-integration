import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { updateScheduleSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { schedulesService } from '@/server/modules/schedules';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; scheduleId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Get schedule detail.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.schedule.info('getSchedule');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const schedule = await schedulesService.getById(workspaceId, scheduleId);
    return ApiResponse.success('Schedule retrieved', schedule);
  } catch (error) {
    logger.schedule.error('getSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Update a schedule.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.schedule.info('updateSchedule');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateScheduleSchema);
    if (!validation.success) return validation.response;

    const schedule = await schedulesService.update(workspaceId, scheduleId, validation.data, auth.context.userId);
    return ApiResponse.success('Schedule updated', schedule);
  } catch (error) {
    logger.schedule.error('updateSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Delete a schedule.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.schedule.info('deleteSchedule');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await schedulesService.delete(workspaceId, scheduleId, auth.context.userId);
    return ApiResponse.success('Schedule deleted', null);
  } catch (error) {
    logger.schedule.error('deleteSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
