import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectService } from '@/server/modules/project/services/project.service';
import { logger } from '@/server/lib/logger';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string; tokenId: string }> }) {
  logger.project.info('revokeApiToken');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId, tokenId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await projectService.revokeApiToken(projectId, tokenId, auth.context.userId);
    logger.project.info('revokeApiToken completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.project.error('revokeApiToken failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
