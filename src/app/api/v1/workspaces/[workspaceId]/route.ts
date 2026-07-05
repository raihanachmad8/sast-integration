import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { workspaceUpdateSchema } from '@/commons/schemas/workspace.schema';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { workspaceService } from '@/server/modules/workspace/workspace.service';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('getWorkspace');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const result = await workspaceService.getById(workspaceId, auth.context.userId);
    logger.workspace.info('getWorkspace completed');
    return ApiResponse.success('Workspace retrieved', result);
  } catch (e) {
    logger.workspace.error('getWorkspace failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('updateWorkspace');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, workspaceUpdateSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await workspaceService.update(workspaceId, validation.data, auth.context.userId);
    logger.workspace.info('updateWorkspace completed');
    return ApiResponse.success(WORKSPACE.MESSAGES.UPDATED, result);
  } catch (e) {
    logger.workspace.error('updateWorkspace failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('deleteWorkspace');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await workspaceService.delete(workspaceId, auth.context.userId);
    logger.workspace.info('deleteWorkspace completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.workspace.error('deleteWorkspace failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
