import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { sourceControlService } from '@/server/modules/source-control';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; repoId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/repositories/:repoId/branches
 * List branches for a repository from its SCM provider (Gitea/GitHub/GitLab).
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, repoId } = await params;
  logger.repository.info('listBranches', { repoId });
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const branches = await sourceControlService.listBranches(repoId, workspaceId);
    return ApiResponse.success('Branches retrieved', branches);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to list branches', 'INTERNAL_ERROR', undefined, 500);
  }
}
