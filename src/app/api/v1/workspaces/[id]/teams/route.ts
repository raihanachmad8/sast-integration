import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { teamService } from '@/server/modules/teams/services/team.service';
import { createTeamSchema } from '@/commons/schemas';
import { TEAM } from '@/server/modules/teams/constants';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/teams
 * List all teams in a workspace.
 * Any workspace member can access.
 */
export async function GET(request: NextRequest, { params }: Params) {
   
  console.info('[TeamsRoute] GET /api/v1/workspaces/:id/teams - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;
   
  console.debug(`[TeamsRoute] GET teams - workspaceId=${workspaceId}`);

 

  // Verify workspace access
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const userId = getUserId(auth.context);
    if (!userId) {
       
      console.error('[TeamsRoute] GET teams failed - no user ID in auth context');
      return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
    }
    const teams = await teamService.list(workspaceId, userId);
     
    console.info(`[TeamsRoute] GET teams success - workspaceId=${workspaceId}, count=${teams.length}`);
     
    return ApiResponse.success(TEAM.MESSAGES.LIST, teams);
  } catch (e) {
     
    console.error(`[TeamsRoute] GET teams error - workspaceId=${workspaceId}`, e);
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/teams
 * Create a new team in the workspace.
 * Only Owner/Manager can create teams.
 */
export async function POST(request: NextRequest, { params }: Params) {
   
  console.info('[TeamsRoute] POST /api/v1/workspaces/:id/teams - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
     
    console.error('[TeamsRoute] POST team failed - no user ID in auth context');
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId } = await params;
   
  console.debug(`[TeamsRoute] POST team - workspaceId=${workspaceId}, userId=${userId}`);

 

  // Only Owner/Manager can create teams
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, createTeamSchema);
  if (!validation.success) return validation.response;

  try {
    const team = await teamService.create(
      workspaceId,
      validation.data,
      userId
    );
     
    console.info(`[TeamsRoute] POST team success - workspaceId=${workspaceId}, teamId=${team.id}`);
     
    return ApiResponse.success(TEAM.MESSAGES.CREATED, team);
  } catch (e) {
     
    console.error(`[TeamsRoute] POST team error - workspaceId=${workspaceId}`, e);
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
