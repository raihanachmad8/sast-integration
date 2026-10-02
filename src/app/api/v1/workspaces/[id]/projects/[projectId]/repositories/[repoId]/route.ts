import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { projectService } from '@/server/modules/project/services/project.service';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; projectId: string; repoId: string }> };

/**
 * DELETE /api/v1/workspaces/:id/projects/:projectId/repositories/:repoId
 * Soft deletes a repository binding from a project.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, projectId, repoId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    await projectService.deleteRepository(workspaceId, projectId, repoId, userId);
    return ApiResponse.success('Repository uninstalled', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
