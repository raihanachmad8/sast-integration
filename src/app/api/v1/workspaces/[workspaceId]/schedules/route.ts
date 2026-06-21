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

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/schedules
 * List schedules for a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const schedules = await schedulesService.list(workspaceId);
    return ApiResponse.success('Schedules retrieved', schedules);
  } catch (error) {
    logger.scan.error('listSchedules failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

const createScheduleSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  branch: z.string().min(1, 'Branch is required').max(100),
  cronExpression: z.string().min(1, 'Cron expression is required').max(100),
  timezone: z.string().min(1).max(50).optional().default('UTC'),
  active: z.boolean().optional().default(true),
});

/**
 * POST /api/v1/workspaces/:workspaceId/schedules
 * Create a new schedule.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, createScheduleSchema);
    if (!validation.success) return validation.response;

    const schedule = await schedulesService.create(validation.data, workspaceId, auth.context.userId);
    return ApiResponse.success('Schedule created', schedule);
  } catch (error) {
    logger.scan.error('createSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
