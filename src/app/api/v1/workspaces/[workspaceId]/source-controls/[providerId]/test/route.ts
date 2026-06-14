import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { sourceControlService } from '@/server/modules/source-control/source-control.service';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';

type RouteContext = { params: Promise<{ workspaceId: string; providerId: string }> };

/**
 * POST /api/v1/workspaces/:workspaceId/source-controls/:providerId/test
 * Test connection to a source control provider.
 * Returns configured credential keys for validation.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await sourceControlService.testConnection(providerId, workspaceId);
    if (!result.configured) {
      return ApiResponse.error('Source control is not configured. Please add credentials first.', 'SOURCE_CONTROL_NOT_CONFIGURED', result, 400);
    }
    return ApiResponse.success('Connection test completed', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
