import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { sourceControlService } from '@/server/modules/source-control/source-control.service';
import { createSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/source-controls
 * List all source control integrations in a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const sourceControls = await sourceControlService.list(workspaceId);
    return ApiResponse.success('Source controls retrieved', sourceControls);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/source-controls
 * Create a new source control integration.
 * Returns redirectUrl for OAuth/App installation flow.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createSourceControlSchema);
  if (!validation.success) return validation.response;

  try {
    const sourceControl = await sourceControlService.create(validation.data, workspaceId, userId);
    const redirectUrl = sourceControlService.buildRedirectUrl(
      sourceControl,
      workspaceId,
      request.nextUrl.origin,
      resolveReturnTo(request),
    );
    return ApiResponse.created('Source control created', { sourceControl, redirectUrl });
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
