import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { findingService } from '@/server/modules/scan';
import { parsePagination } from '@/server/http/validate';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/findings
 * List findings scoped to user's accessible projects.
 * Repositories with null projectId are visible to all workspace members.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const repositoryId = searchParams.get('repositoryId') || undefined;
    const scanId = searchParams.get('scanId') || undefined;
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const scanner = searchParams.get('scanner') || undefined;
    const search = searchParams.get('search') || undefined;
    const { page, perPage } = parsePagination(searchParams, { perPage: 50 });

    // Compute user's accessible projects for project-scoped listing
    const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
    const accessibleProjectIds = await projectRepository.getAccessibleProjectIds(workspaceId, auth.context.userId, role ?? undefined);

    const result = await findingService.list(projectId, workspaceId, {
      scanId,
      status,
      severity,
      scanner,
      search,
      repositoryId,
      accessibleProjectIds: accessibleProjectIds ?? undefined,
    }, perPage, page);

    return ApiResponse.paginated('Findings retrieved', result.data, {
      page,
      perPage,
      total: result.total,
      totalPages: Math.ceil(result.total / perPage),
    });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to list findings', 'INTERNAL_ERROR', undefined, 500);
  }
}
