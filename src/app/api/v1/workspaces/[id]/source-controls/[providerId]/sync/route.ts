import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { sourceControlService } from '@/server/modules/source-controls/source-control.service';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; providerId: string }> };

/**
 * POST /api/v1/workspaces/:id/source-controls/:providerId/sync
 * Returns the current repository binding summary for a provider.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, providerId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }

    const result = await sourceControlService.sync(providerId, workspaceId, userId);
    if (!result) {
      return ApiResponse.error('Source control not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Source control synced', result);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
