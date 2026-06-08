import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { scanService } from '@/server/modules/scan';
import { validateBody } from '@/server/http/validate';
import { createScanSchema } from '@/commons/schemas';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const per_page = parseInt(searchParams.get('per_page') ?? '10', 10);
    const result = await scanService.list(workspaceId, { page, per_page });
    return ApiResponse.paginated('Scans retrieved', result.data, {
      page,
      perPage: per_page,
      total: result.total,
      totalPages: Math.ceil(result.total / per_page),
    });
  } catch (error) {
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createScanSchema);
  if (!validation.success) return validation.response;

  try {
    const { repositoryId, branch, profile } = validation.data;
    const scan = await scanService.create({ repository_id: repositoryId, branch, origin: profile ?? 'manual' }, workspaceId, auth.context.userId);
    return ApiResponse.created('Scan created', scan);
  } catch (error) {
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
