import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { teamService } from '@/server/modules/teams/services/team.service';
import { updateTeamSchema } from '@/commons/schemas';
import { TEAM } from '@/server/modules/teams/constants';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; teamId: string }> };

/**
 * GET /api/v1/workspaces/:id/teams/:teamId
 * Get a single team by ID.
 */
export async function GET(request: NextRequest, { params }: Params) {
   
  console.info('[TeamDetailRoute] GET /api/v1/workspaces/:id/teams/:teamId - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, teamId } = await params;
   
  console.debug(`[TeamDetailRoute] GET team - workspaceId=${workspaceId}, teamId=${teamId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
       
      console.error('[TeamDetailRoute] GET team failed - no user ID in auth context');
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    const team = await teamService.getById(workspaceId, teamId, userId);
     
    console.info(`[TeamDetailRoute] GET team success - teamId=${teamId}, name=${team.name}`);
     
    return ApiResponse.success(TEAM.MESSAGES.DETAIL, team);
  } catch (e) {
     
    console.error(`[TeamDetailRoute] GET team error - workspaceId=${workspaceId}, teamId=${teamId}`, e);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:id/teams/:teamId
 * Update a team.
 */
export async function PUT(request: NextRequest, { params }: Params) {
   
  console.info('[TeamDetailRoute] PUT /api/v1/workspaces/:id/teams/:teamId - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, teamId } = await params;
   
  console.debug(`[TeamDetailRoute] PUT team - workspaceId=${workspaceId}, teamId=${teamId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateTeamSchema);
  if (!validation.success) return validation.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
       
      console.error('[TeamDetailRoute] PUT team failed - no user ID in auth context');
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    const team = await teamService.update(workspaceId, teamId, validation.data, userId);
     
    console.info(`[TeamDetailRoute] PUT team success - teamId=${teamId}, name=${team.name}`);
     
    return ApiResponse.success(TEAM.MESSAGES.UPDATED, team);
  } catch (e) {
     
    console.error(`[TeamDetailRoute] PUT team error - workspaceId=${workspaceId}, teamId=${teamId}`, e);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/teams/:teamId
 * Soft delete a team.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
   
  console.info('[TeamDetailRoute] DELETE /api/v1/workspaces/:id/teams/:teamId - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, teamId } = await params;
   
  console.debug(`[TeamDetailRoute] DELETE team - workspaceId=${workspaceId}, teamId=${teamId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.OWNER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
       
      console.error('[TeamDetailRoute] DELETE team failed - no user ID in auth context');
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    await teamService.softDelete(workspaceId, teamId, userId);
     
    console.info(`[TeamDetailRoute] DELETE team success - teamId=${teamId}`);
     
    return ApiResponse.success(TEAM.MESSAGES.DELETED, null);
  } catch (e) {
     
    console.error(`[TeamDetailRoute] DELETE team error - workspaceId=${workspaceId}, teamId=${teamId}`, e);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
