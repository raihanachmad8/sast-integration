import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { teamFormSchema, teamListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { teamService } from '@/server/modules/teams';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.team.info('listTeams');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = teamListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const result = await teamService.list(workspaceId, auth.context.userId, parsed.data);
    logger.team.info('listTeams completed', { total: result.total });
    return ApiResponse.paginated('Teams retrieved', result.data, { page: result.page, perPage: result.perPage, total: result.total, lastPage: result.lastPage });
  } catch (e) {
    logger.team.error('listTeams failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.team.info('createTeam');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, teamFormSchema);
  if (!validation.success) return validation.response;

  try {
    const team = await teamService.create(workspaceId, validation.data, auth.context.userId);
    logger.team.info('createTeam completed');
    return ApiResponse.created('Team created', team);
  } catch (e) {
    logger.team.error('createTeam failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
