import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

// In-memory store for demo (replace with DB in production)
const schedulesStore = new Map<string, Array<Record<string, unknown>>>();

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
    const schedules = schedulesStore.get(workspaceId) ?? [];
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('per_page') ?? '10', 10);
    const start = (page - 1) * perPage;
    const data = schedules.slice(start, start + perPage);

    return ApiResponse.paginated('Schedules retrieved', data, {
      page,
      perPage,
      total: schedules.length,
      totalPages: Math.ceil(schedules.length / perPage),
    });
  } catch (error) {
    logger.scan.error('listSchedules failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/schedules
 * Create a new schedule.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  try {
    const body = await request.json();
    const schedule = {
      id: `sch_${Date.now()}`,
      workspaceId,
      repositoryId: body.repositoryId,
      repositoryName: body.repositoryName ?? 'Unknown',
      branch: body.branch ?? 'main',
      cronExpression: body.cronExpression,
      timezone: body.timezone ?? 'UTC',
      active: body.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const schedules = schedulesStore.get(workspaceId) ?? [];
    schedules.push(schedule);
    schedulesStore.set(workspaceId, schedules);

    return ApiResponse.success('Schedule created', schedule);
  } catch (error) {
    logger.scan.error('createSchedule failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
