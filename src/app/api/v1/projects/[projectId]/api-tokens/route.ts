import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { projectService } from '@/server/modules/project/services/project.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { validateBody } from '@/server/http/validate';
import { createApiTokenSchema } from '@/commons/schemas';

type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/v1/projects/:projectId/api-tokens
 * List all (active + revoked) project API tokens.
 * Requires workspace membership.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  if (auth.context.type !== 'user_session') {
    return ApiResponse.error('Project token management requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { projectId } = await params;

  try {
    const project = await projectRepository.findById(projectId);
    if (!project?.workspace_id) {
      return ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404);
    }

    const wsCheck = await requireWorkspaceRole(
      withWorkspaceId(request, project.workspace_id),
      auth.context,
      ROLE.MEMBER
    );
    if (!wsCheck.success) return wsCheck.response;

    const tokens = await projectService.listApiTokens(projectId, auth.context.userId);
    return ApiResponse.success('Project API tokens retrieved', { tokens });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to list tokens';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/projects/:projectId/api-tokens
 * Create a new CI token for this project.
 * The raw token value is returned exactly once in the response.
 * Recommended minimum role: MANAGER (or OWNER).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  if (auth.context.type !== 'user_session') {
    return ApiResponse.error('Project token management requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { projectId } = await params;

  try {
    const project = await projectRepository.findById(projectId);
    if (!project?.workspace_id) {
      return ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404);
    }

    // Stronger role for token creation (can be relaxed to MEMBER if desired)
    const wsCheck = await requireWorkspaceRole(
      withWorkspaceId(request, project.workspace_id),
      auth.context,
      ROLE.MANAGER
    );
    if (!wsCheck.success) return wsCheck.response;

    const validation = await validateBody(request, createApiTokenSchema);
    if (!validation.success) {
      return validation.response;
    }

    // At this point we know it's a user session (we returned earlier otherwise)
    const userId = (auth.context as { userId: string }).userId;

    const result = await projectService.createApiToken(projectId, userId, validation.data);

    // Security: the raw token must only be shown once. Client should store it securely.
    return ApiResponse.success(
      'Project API token created. Store the token value securely — it will not be shown again.',
      result
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      return ApiResponse.error(e.message, 'PROJECT_ERROR', undefined, 400);
    }
    return ApiResponse.error('Failed to create token', 'INTERNAL_ERROR', undefined, 500);
  }
}
