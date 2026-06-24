import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { teamService } from '@/server/modules/teams/services/team.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { teamUpdateSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; teamId: string }> }) {
  logger.team.info('getTeam');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, teamId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const team = await teamService.getById(workspace.context.workspaceId, teamId, auth.context.userId);
    logger.team.info('getTeam completed');
    return ApiResponse.success('Team retrieved', team);
  } catch (e) {
    logger.team.error('getTeam failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; teamId: string }> }) {
  logger.team.info('updateTeam');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, teamId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, teamUpdateSchema);
  if (!validation.success) return validation.response;

  try {
    const team = await teamService.update(workspace.context.workspaceId, teamId, validation.data, auth.context.userId);
    logger.team.info('updateTeam completed');
    return ApiResponse.success('Team updated', team);
  } catch (e) {
    logger.team.error('updateTeam failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; teamId: string }> }) {
  logger.team.info('deleteTeam');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, teamId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await teamService.softDelete(workspace.context.workspaceId, teamId, auth.context.userId);
    logger.team.info('deleteTeam completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.team.error('deleteTeam failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
