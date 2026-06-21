import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; projectId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/projects/:projectId/members
 * List all members of a project (direct + team-based).
 * Returns deduplicated list — direct project membership takes precedence over team membership.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const members = await projectRepository.getProjectMembers(projectId, workspaceId);

    return ApiResponse.success('Project members retrieved', members);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    logger.project.error('listProjectMembers failed', { error: e instanceof Error ? e.message : String(e) });
    return ApiResponse.error('Failed to list project members', 'INTERNAL_ERROR', undefined, 500);
  }
}
