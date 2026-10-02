import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { projectService } from '@/server/modules/project/services/project.service';
import { updateProjectSchema } from '@/commons/schemas';
import { PROJECT } from '@/server/modules/project/constants';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; projectId: string }> };

/**
 * GET /api/v1/workspaces/:id/projects/:projectId
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    const project = await projectService.getById(projectId, userId);
    return ApiResponse.success(PROJECT.MESSAGES.DETAIL, project);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PATCH /api/v1/workspaces/:id/projects/:projectId
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateProjectSchema);
  if (!validation.success) return validation.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    const project = await projectService.update(projectId, validation.data, userId);
    return ApiResponse.success(PROJECT.MESSAGES.UPDATED, project);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/projects/:projectId
 * Soft delete
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.OWNER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    await projectService.softDelete(projectId, userId);
    return ApiResponse.success(PROJECT.MESSAGES.DELETED, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
