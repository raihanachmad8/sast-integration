import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { createApiTokenSchema, apiTokenListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { projectService } from '@/server/modules/project';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('listApiTokens');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = apiTokenListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const result = await projectService.listApiTokens(projectId, auth.context.userId, parsed.data);
    logger.project.info('listApiTokens completed', { total: result.total });
    return ApiResponse.paginated('API tokens retrieved', result.data, { page: result.page, perPage: result.perPage, total: result.total, lastPage: result.lastPage });
  } catch (e) {
    logger.project.error('listApiTokens failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('createApiToken');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createApiTokenSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await projectService.createApiToken(projectId, validation.data, auth.context.userId);
    logger.project.info('createApiToken completed');
    return ApiResponse.created('API token created', result);
  } catch (e) {
    logger.project.error('createApiToken failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
