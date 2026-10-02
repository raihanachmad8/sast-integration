import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { projectService } from '@/server/modules/project/services/project.service';
import { scanPolicyService } from '@/server/modules/scan/services/scan-policy.service';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { z } from 'zod';

type Params = { params: Promise<{ id: string; projectId: string; repoId: string }> };

const attachPolicySchema = z.object({
  policy_id: z.string().uuid('Invalid policy ID format'),
});

/**
 * PUT /api/v1/workspaces/:id/projects/:projectId/repositories/:repoId/policy
 *
 * Attach a scan policy to this repository (enables managed scanning).
 * Only Manager+ can perform this action.
 *
 * Body: { "policy_id": "uuid-of-policy" }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, repoId } = await params;
  // projectId available for future finer-grained authorization if needed

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, attachPolicySchema);
  if (!validation.success) return validation.response;

  try {
    // Full validation through the policy service (ownership, scanners, repository type, etc.)
    await scanPolicyService.preparePolicyAttachment(
      validation.data.policy_id,
      repoId,
      workspaceId
    );

    // Perform the attachment
    await projectService.setRepositoryPolicy(
      repoId,
      validation.data.policy_id,
      userId,
      workspaceId
    );

    return ApiResponse.success('Scan policy attached to repository successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/projects/:projectId/repositories/:repoId/policy
 *
 * Detach the current scan policy from this repository.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, repoId } = await params;
  // projectId available for future finer-grained authorization if needed

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    await projectService.setRepositoryPolicy(repoId, null, userId, workspaceId);
    return ApiResponse.success('Scan policy detached from repository successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
