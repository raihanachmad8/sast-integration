import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { teamService } from '@/server/modules/teams/services/team.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { teamFormSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const data = await teamService.list(workspace.context.workspaceId, auth.context.userId);
    return ApiResponse.success('Teams retrieved', data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, teamFormSchema);
  if (!validation.success) return validation.response;

  try {
    const team = await teamService.create(workspace.context.workspaceId, validation.data, auth.context.userId);
    return ApiResponse.created('Team created', team);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
