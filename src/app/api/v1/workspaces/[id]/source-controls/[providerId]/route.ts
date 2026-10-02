import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { sourceControlService } from '@/server/modules/source-controls/source-control.service';
import { updateSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; providerId: string }> };

/**
 * GET /api/v1/workspaces/:id/source-controls/:providerId
 * Get a single source control integration.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, providerId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const sourceControl = await sourceControlService.getById(providerId);

    if (!sourceControl || sourceControl.workspace_id !== workspaceId) {
      return ApiResponse.error('Source control not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Source control retrieved', sourceControl);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PATCH /api/v1/workspaces/:id/source-controls/:providerId
 * Updates a source control integration.
 */
export async function PATCH(request: NextRequest, context: Params) {
  return updateSourceControl(request, context);
}

/**
 * PUT /api/v1/workspaces/:id/source-controls/:providerId
 * Updates a source control integration for legacy callers.
 */
export async function PUT(request: NextRequest, context: Params) {
  return updateSourceControl(request, context);
}

async function updateSourceControl(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, providerId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateSourceControlSchema);
  if (!validation.success) return validation.response;

  try {
    const existing = await sourceControlService.getById(providerId);
    if (!existing || existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Source control not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    const updated = await sourceControlService.update(providerId, validation.data);
    const redirectUrl = sourceControlService.buildRedirectUrl(
      updated,
      workspaceId,
      request.nextUrl.origin,
      resolveReturnTo(request)
    );
    return ApiResponse.success('Source control updated successfully', { sourceControl: updated, redirectUrl });
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

function resolveReturnTo(request: NextRequest) {
  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    const url = new URL(referer);
    if (url.origin !== request.nextUrl.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * DELETE /api/v1/workspaces/:id/source-controls/:providerId
 * Delete a source control integration.
 * Only Manager+ can delete.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, providerId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const existing = await sourceControlService.getById(providerId);
    if (!existing || existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Source control not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    await sourceControlService.delete(providerId);
    return ApiResponse.success('Source control deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
