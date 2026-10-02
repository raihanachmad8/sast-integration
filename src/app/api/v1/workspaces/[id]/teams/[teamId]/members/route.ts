import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { teamService } from '@/server/modules/teams/services/team.service';

type Params = { params: Promise<{ id: string; teamId: string }> };

/**
 * GET /api/v1/workspaces/:id/teams/:teamId/members
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, teamId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }

    const members = await teamService.listMembers(workspaceId, teamId, userId);
    return ApiResponse.success('Team members retrieved', members);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/teams/:teamId/members
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  await params;
  return ApiResponse.error(
    'Team members are managed through team create/update.',
    'METHOD_NOT_ALLOWED',
    undefined,
    405,
  );
}
