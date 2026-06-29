import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { createReportSchema, reportListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { reportsService } from '@/server/modules/reports';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.report.info('listReports');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = reportListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order } = parsed.data;

    const result = await reportsService.list(workspaceId, { page, perPage, search, sort, order });

    logger.report.info('listReports completed');
    return ApiResponse.paginated('Reports retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (error) {
    logger.report.error('listReports failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.report.info('createReport');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_EXPORT);
  if (!workspace.success) return workspace.response;

  try {
    const result = await validateBody(request, createReportSchema);
    if (!result.success) return result.response;

    const report = await reportsService.generate(workspaceId, result.data, auth.context.userId);
    return ApiResponse.created('Report created', report);
  } catch (e) {
    logger.report.error('createReport failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) {
      return ApiResponse.error('Invalid report data', 'VALIDATION_ERROR', e.flatten().fieldErrors, 400);
    }
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
