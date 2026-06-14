import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
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
    // Return 404 for now (no DB implementation)
    return ApiResponse.error('Schedule not found', 'NOT_FOUND', undefined, 404);
  } catch (error) {
    logger.scan.error('getSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/schedules/:scheduleId
 * Update a schedule.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scheduleId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  try {
    return ApiResponse.error('Schedule not found', 'NOT_FOUND', undefined, 404);
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
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  try {
    return ApiResponse.error('Schedule not found', 'NOT_FOUND', undefined, 404);
  } catch (error) {
    logger.scan.error('deleteSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
