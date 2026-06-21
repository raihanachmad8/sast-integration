import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { scanService, managedScanService } from '@/server/modules/scan';
import { parsePagination, validateBody } from '@/server/http/validate';
import { createScanSchema } from '@/commons/schemas';
import { logger } from '@/server/lib/logger';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.scan.info('listScans');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, perPage } = parsePagination(searchParams);
    const search = searchParams.get('search') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const stage = searchParams.get('stage') ?? undefined;
    const origin = searchParams.get('origin') ?? undefined;

    const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
    const accessibleProjectIds = await projectRepository.getAccessibleProjectIds(workspaceId, auth.context.userId, role ?? undefined);

    const result = await scanService.list(workspaceId, {
      page,
      perPage,
      search,
      filters: { status, stage, origin },
      accessibleProjectIds: accessibleProjectIds ?? undefined,
    }, auth.context.userId);

    logger.scan.info('listScans completed');
    return ApiResponse.paginated('Scans retrieved', result.data, {
      page,
      perPage,
      total: result.total,
      totalPages: Math.ceil(result.total / perPage),
    });
  } catch (error) {
    logger.scan.error('listScans failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.scan.info('createScan');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createScanSchema);
  if (!validation.success) return validation.response;

  try {
    const { repositoryId, branch, scanners } = validation.data as { repositoryId: string; branch: string; scanners?: string[] };

    // Trigger managed scan (clones repo, runs scanners, enqueues jobs)
    const result = await managedScanService.triggerManualScan({
      workspaceId,
      repositoryId,
      userId: auth.context.userId,
      branch,
      scanners: scanners as Parameters<typeof managedScanService.triggerManualScan>[0]['scanners'],
      triggerSource: 'manual',
    });

    logger.scan.info('createScan completed', { scanId: result.scanId });
    return ApiResponse.created('Scan triggered', result);
  } catch (error) {
    logger.scan.error('createScan failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
