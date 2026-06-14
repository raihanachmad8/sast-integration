import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { scanService } from '@/server/modules/scan';

type RouteContext = { params: Promise<{ workspaceId: string; scanId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/scans/:scanId
 * Get scan detail with findings count, severity breakdown, and AI stats.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, scanId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const detail = await scanService.getDetail(scanId, workspaceId, auth.context.userId);
    return ApiResponse.success('Scan retrieved', detail);
  } catch (error) {
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Failed to get scan detail', 'INTERNAL_ERROR', undefined, 500);
  }
}
