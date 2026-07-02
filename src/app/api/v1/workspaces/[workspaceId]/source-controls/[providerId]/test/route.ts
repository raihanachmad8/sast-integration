import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { sourceControlService } from '@/server/modules/source-control';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

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
  logger.sourceControl.info('testConnection', { providerId });
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await sourceControlService.testConnection(workspaceId, providerId);
    if (!result.configured) {
      return ApiResponse.error('Source control is not configured. Please add credentials first.', 'SOURCE_CONTROL_NOT_CONFIGURED', result, 400);
    }
    return ApiResponse.success('Connection test completed', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
