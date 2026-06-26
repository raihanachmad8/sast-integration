import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { sourceControlImportService } from '@/server/modules/source-control/source-control-import.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; importId: string }> };

/**
 * DELETE /api/v1/workspaces/:workspaceId/source-controls/imports/:importId
 * Uninstall a repository — revokes webhook + soft-deletes repo + marks import uninstalled.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('delete request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId, importId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await sourceControlImportService.uninstall(userId, importId);
    return ApiResponse.success('Repository uninstalled', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to uninstall repository', 'INTERNAL_ERROR', undefined, 500);
  }
}
