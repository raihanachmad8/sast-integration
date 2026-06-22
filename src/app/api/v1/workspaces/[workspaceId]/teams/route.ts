import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody, parsePagination } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { teamService } from '@/server/modules/teams/services/team.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { teamFormSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.team.info('listTeams');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const { page, perPage } = parsePagination(request.nextUrl.searchParams);
    const project = request.nextUrl.searchParams.get('project') ?? undefined;
    const search = request.nextUrl.searchParams.get('search') ?? undefined;

    const allTeams = await teamService.list(workspace.context.workspaceId, auth.context.userId);

    // Apply filters
    let filtered = allTeams;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
    }
    if (project) {
      filtered = filtered.filter((t) => t.projectIds?.includes(project));
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    logger.team.info('listTeams completed', { total, search, project });
    return ApiResponse.paginated('Teams retrieved', paginated, { page, perPage, total, totalPages: Math.ceil(total / perPage) });
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
    const team = await teamService.create(workspace.context.workspaceId, validation.data, auth.context.userId);
    logger.team.info('createTeam completed');
    return ApiResponse.created('Team created', team);
  } catch (e) {
    logger.team.error('createTeam failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
