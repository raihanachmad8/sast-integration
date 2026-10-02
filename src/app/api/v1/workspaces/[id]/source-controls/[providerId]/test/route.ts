import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { sourceControlService } from '@/server/modules/source-controls/source-control.service';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; providerId: string }> };

/**
 * POST /api/v1/workspaces/:id/source-controls/:providerId/test
 * Validates the saved provider configuration.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, providerId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const result = await sourceControlService.testConnection(providerId, workspaceId);
    if (!result) {
      return ApiResponse.error('Source control not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    if (!result.configured) {
      return ApiResponse.error('Source control credentials are not configured', 'SOURCE_CONTROL_NOT_CONFIGURED', result, 400);
    }

    return ApiResponse.success('Source control configuration is valid', result);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
