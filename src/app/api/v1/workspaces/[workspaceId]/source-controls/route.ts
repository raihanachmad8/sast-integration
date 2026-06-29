import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { createSourceControlSchema, sourceControlListQuerySchema } from '@/commons/schemas';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { sourceControlService } from '@/server/modules/source-control';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/source-controls
 * List all source control integrations in a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.sourceControl.info('listSourceControls');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = sourceControlListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order } = parsed.data;
    const result = await sourceControlService.list(workspaceId, { page, perPage, search, sort, order });
    return ApiResponse.paginated('Source controls retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/source-controls
 * Create a new source control integration for a workspace.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('User ID is required', 'USER_ID_REQUIRED', undefined, 400);
  }

  try {
    const result = await validateBody(request, createSourceControlSchema);
    if (!result.success) return result.response;

    const sourceControl = await sourceControlService.create(workspaceId, result.data, userId);
    return ApiResponse.created('Source control integration created', sourceControl);
  } catch (error) {
    logger.sourceControl.error('createSourceControl failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof ZodError) {
      return ApiResponse.error('Invalid source control data', 'VALIDATION_ERROR', error.flatten().fieldErrors, 400);
    }
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
