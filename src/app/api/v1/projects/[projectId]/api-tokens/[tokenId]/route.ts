import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { projectService } from '@/server/modules/project/services/project.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';

/**
 * DELETE /api/v1/projects/:projectId/api-tokens/:tokenId
 * Revoke (soft-delete) a project API token.
 * Requires MANAGER or higher in the workspace.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; tokenId: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  if (auth.context.type !== 'user_session') {
    return ApiResponse.error('Project token management requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { projectId, tokenId } = await params;

  try {
    const project = await projectRepository.findById(projectId);
    if (!project?.workspace_id) {
      return ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404);
    }

    const wsCheck = await requireWorkspaceRole(
      withWorkspaceId(request, project.workspace_id),
      auth.context,
      ROLE.MANAGER
    );
    if (!wsCheck.success) return wsCheck.response;

    const revoked = await projectService.revokeApiToken(projectId, tokenId, auth.context.userId);
    if (!revoked) {
      return ApiResponse.error('Token not found or already revoked', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Project API token revoked successfully', { id: tokenId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to revoke token';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
