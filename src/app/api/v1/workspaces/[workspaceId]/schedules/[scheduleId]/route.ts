import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { schedulesService } from '@/server/modules/schedules';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; scheduleId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Get schedule detail.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const schedule = await schedulesService.getById(scheduleId, workspaceId);
    return ApiResponse.success('Schedule retrieved', schedule);
  } catch (error) {
    logger.scan.error('getSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

const updateScheduleSchema = z.object({
  repositoryId: z.string().optional(),
  branch: z.string().optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
});

/**
 * PUT /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Update a schedule.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateScheduleSchema);
    if (!validation.success) return validation.response;

    const schedule = await schedulesService.update(scheduleId, validation.data, workspaceId, auth.context.userId);
    return ApiResponse.success('Schedule updated', schedule);
  } catch (error) {
    logger.scan.error('updateSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Delete a schedule.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await schedulesService.delete(scheduleId, workspaceId, auth.context.userId);
    return ApiResponse.success('Schedule deleted', null);
  } catch (error) {
    logger.scan.error('deleteSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
