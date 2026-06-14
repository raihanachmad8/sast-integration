import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { dashboardService } from '@/server/modules/dashboard/dashboard.service';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return ApiResponse.error('workspaceId is required', 'VALIDATION_ERROR', undefined, 400);
  }

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.DASHBOARD_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    logger.dashboard.info('getStats');
    const data = await dashboardService.getStats(workspace.context.workspaceId);
    logger.dashboard.info('getStats completed');
    return ApiResponse.success('Dashboard stats retrieved', data);
  } catch (error) {
    logger.dashboard.error('getStats failed', { error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
