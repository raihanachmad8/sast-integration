import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { teamService } from '@/server/modules/teams/services/team.service';
import { PERMISSION } from '@/commons/constants/permissions';
import { teamUpdateSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { teamId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const team = await teamService.getById(workspace.context.workspaceId, teamId, auth.context.userId);
    return ApiResponse.success('Team retrieved', team);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { teamId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, teamUpdateSchema);
  if (!validation.success) return validation.response;

  try {
    const team = await teamService.update(workspace.context.workspaceId, teamId, validation.data, auth.context.userId);
    return ApiResponse.success('Team updated', team);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { teamId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.TEAM_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await teamService.softDelete(workspace.context.workspaceId, teamId, auth.context.userId);
    return ApiResponse.success('Team deleted', null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
