import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { checkAllScannerAvailability } from '@/server/modules/scan/scanner-availability';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/scanners
 * Returns availability status for all configured scanners.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const availability = await checkAllScannerAvailability();
    return ApiResponse.success('Scanners retrieved', availability);
  } catch (_error) {
    return ApiResponse.error('Failed to check scanner availability', 'INTERNAL_ERROR', undefined, 500);
  }
}
