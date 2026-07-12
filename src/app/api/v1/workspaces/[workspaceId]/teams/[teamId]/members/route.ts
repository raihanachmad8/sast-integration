import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { teamRepository } from '@/server/modules/teams/repositories/team.repository';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

/**
 * GET /api/v1/workspaces/:workspaceId/teams/:teamId/members
 * List members of a specific team.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; teamId: string }> }) {
  logger.team.info('listTeamMembers');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, teamId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const members = await teamRepository.listMembers(teamId);
    logger.team.info('listTeamMembers completed', { teamId, count: members.length });
    return ApiResponse.success('Team members retrieved', members);
  } catch (e) {
    logger.team.error('listTeamMembers failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
