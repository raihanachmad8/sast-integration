import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { reportsService } from '@/server/modules/reports/reports.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; reportId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.report.info('getReport');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, reportId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const report = await reportsService.getById(reportId, workspaceId);
    logger.report.info('getReport completed');
    return ApiResponse.success('Report retrieved', report);
  } catch (error) {
    logger.report.error('getReport failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.report.info('deleteReport');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, reportId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_EXPORT);
  if (!workspace.success) return workspace.response;

  try {
    await reportsService.delete(reportId, workspaceId, auth.context.userId);
    logger.report.info('deleteReport completed');
    return ApiResponse.noContent();
  } catch (error) {
    logger.report.error('deleteReport failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
