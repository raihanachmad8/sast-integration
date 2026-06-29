import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { repositoryListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

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
  logger.repository.info('listRepositories');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.REPOSITORY_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = repositoryListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order, imported } = parsed.data;
    const filterMode = imported === 'true' ? 'imported' : imported === 'false' ? 'manual' : undefined;

    const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
    const accessibleProjectIds = await projectRepository.getAccessibleProjectIds(workspaceId, auth.context.userId, role ?? undefined);
    const result = await projectRepository.listRepositoriesByWorkspace(workspaceId, filterMode, accessibleProjectIds ?? undefined, { page, perPage, search, sort, order });

    return ApiResponse.paginated('Repositories retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (e) {
    logger.repository.error('listRepositories failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
