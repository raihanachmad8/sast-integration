import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { sourceControlService } from '@/server/modules/source-control/source-control.service';
import { updateSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; providerId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/source-controls/:providerId
 * Get a single source control integration.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const sourceControl = await sourceControlService.getById(providerId, workspaceId);
    return ApiResponse.success('Source control retrieved', sourceControl);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PATCH /api/v1/workspaces/:workspaceId/source-controls/:providerId
 * Update a source control integration.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateSourceControl(request, context);
}

/**
 * PUT /api/v1/workspaces/:workspaceId/source-controls/:providerId
 * Update a source control integration (legacy support).
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  logger.workspace.info('put request');

  return updateSourceControl(request, context);
}

async function updateSourceControl(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateSourceControlSchema);
  if (!validation.success) return validation.response;

  try {
    const updated = await sourceControlService.update(providerId, validation.data, workspaceId, userId);
    const redirectUrl = sourceControlService.buildRedirectUrl(
      updated,
      workspaceId,
      request.nextUrl.origin,
      resolveReturnTo(request),
    );
    return ApiResponse.success('Source control updated', { sourceControl: updated, redirectUrl });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
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
 * DELETE /api/v1/workspaces/:workspaceId/source-controls/:providerId
 * Delete a source control integration.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('delete request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await sourceControlService.delete(providerId, workspaceId, userId);
    return ApiResponse.noContent();
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
