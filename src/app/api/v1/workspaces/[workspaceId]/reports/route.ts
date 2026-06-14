import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { parsePagination } from '@/server/http/validate';
import { reportsService } from '@/server/modules/reports/reports.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

const createReportSchema = z.object({
  type: z.enum(['findings', 'verdict', 'executive', 'compliance']),
  title: z.string().min(1).max(255).optional(),
  format: z.enum(['pdf', 'xlsx', 'csv']).optional().default('pdf'),
  range: z.string().optional(),
});

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.report.info('listReports');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, perPage } = parsePagination(searchParams);
    const search = searchParams.get('search') ?? undefined;

    const result = await reportsService.list(workspaceId, { page, perPage, search });

    logger.report.info('listReports completed');
    return ApiResponse.paginated('Reports retrieved', result.data, {
      page,
      perPage,
      total: result.total,
      totalPages: Math.ceil(result.total / perPage),
    });
  } catch (error) {
    logger.report.error('listReports failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.report.info('generateReport');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPORT_EXPORT);
  if (!workspace.success) return workspace.response;

  try {
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: parsed.error.issues }, 422);
    }

    const { type, title, format, range } = parsed.data;

    const report = await reportsService.generate(
      { type, title: title ?? `${type} report`, format, range },
      workspaceId,
      auth.context.userId,
    );

    logger.report.info('generateReport completed', { reportId: report.id });
    return ApiResponse.created('Report generated', report);
  } catch (error) {
    logger.report.error('generateReport failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
