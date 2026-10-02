import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { sourceControlService } from '@/server/modules/source-controls/source-control.service';
import { createSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/source-controls
 * List all source control integrations in a workspace.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const sourceControls = await sourceControlService.listByWorkspace(workspaceId);
    return ApiResponse.success('Source controls retrieved', sourceControls);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/source-controls
 * Create a new source control integration.
 * Only Manager+ can create.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, createSourceControlSchema);
  if (!validation.success) return validation.response;

  try {
    const sourceControl = await sourceControlService.create(workspaceId, userId, validation.data);
    const redirectUrl = sourceControlService.buildRedirectUrl(
      sourceControl,
      workspaceId,
      request.nextUrl.origin,
      resolveReturnTo(request)
    );
    return ApiResponse.success('Source control created successfully', { sourceControl, redirectUrl });
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
