import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/repositories
 * List repositories scoped to user's accessible projects.
 * Repos with null projectId are visible to all workspace members.
 * ?imported=true — only repos imported from source control.
 * ?imported=false — only manually connected repos.
 * No param — all repos.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const imported = request.nextUrl.searchParams.get('imported');
    const filterMode = imported === 'true' ? 'imported' : imported === 'false' ? 'manual' : undefined;

    const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
    const accessibleProjectIds = await projectRepository.getAccessibleProjectIds(workspaceId, auth.context.userId, role ?? undefined);
    const rows = await projectRepository.listRepositoriesByWorkspace(workspaceId, filterMode, accessibleProjectIds ?? undefined);

    return ApiResponse.paginated('Repositories retrieved', rows, {
      page: 1,
      perPage: rows.length || 10,
      total: rows.length,
      totalPages: 1,
    });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to list repositories', 'INTERNAL_ERROR', undefined, 500);
  }
}
