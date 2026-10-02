import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { projectService } from '@/server/modules/project/services/project.service';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string; projectId: string; tokenId: string }> };

/**
 * DELETE /api/v1/workspaces/:id/projects/:projectId/api-tokens/:tokenId
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId, tokenId } = await params;
  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    await projectService.revokeApiToken(projectId, tokenId, userId);
    return ApiResponse.success('API token revoked', { id: tokenId });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
