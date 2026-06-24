import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { teamService } from '@/server/modules/teams/services/team.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; teamId: string }> }) {
  logger.team.info('listTeamMembers');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, teamId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const data = await teamService.listMembers(workspaceId, teamId, auth.context.userId);
    logger.team.info('listTeamMembers completed', { count: data.length });
    return ApiResponse.success('Team members retrieved', data);
  } catch (e) {
    logger.team.error('listTeamMembers failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
