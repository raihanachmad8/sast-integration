import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { createScheduleSchema, scheduleListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { schedulesService } from '@/server/modules/schedules';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/schedules
 * List schedules for a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.schedule.info('listSchedules');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = scheduleListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order } = parsed.data;
    const result = await schedulesService.list(workspaceId, { page, perPage, search, sort, order });
    return ApiResponse.paginated('Schedules retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (error) {
    logger.schedule.error('listSchedules failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/schedules
 * Create a new schedule for a repository in a workspace.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.schedule.info('createSchedule');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCHEDULE_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await validateBody(request, createScheduleSchema);
    if (!result.success) return result.response;

    const schedule = await schedulesService.create(workspaceId, result.data, auth.context.userId);
    return ApiResponse.created('Schedule created', schedule);
  } catch (error) {
    logger.schedule.error('createSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof ZodError) {
      return ApiResponse.error('Invalid schedule data', 'VALIDATION_ERROR', error.flatten().fieldErrors, 400);
    }
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
