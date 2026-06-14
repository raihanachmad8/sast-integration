import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectService } from '@/server/modules/project/services/project.service';
import { validateBody } from '@/server/http/validate';
import { createApiTokenSchema } from '@/commons/schemas';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('listApiTokens');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const tokens = await projectService.listApiTokens(projectId, auth.context.userId);
    logger.project.info('listApiTokens completed');
    return ApiResponse.success('API tokens retrieved', { tokens });
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
    const result = await projectService.createApiToken(projectId, auth.context.userId, validation.data);
    logger.project.info('createApiToken completed');
    return ApiResponse.success('API token created', result);
  } catch (e) {
    logger.project.error('createApiToken failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
