import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { projectApiTokenRepository } from '@/server/modules/project/repositories/project-api-token.repository';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string; projectId: string }> };

/**
 * GET /api/v1/workspaces/:id/projects/:projectId/api-tokens
 */
export async function GET(request: NextRequest, { params }: Params) {
   
  console.info('[ApiTokensRoute] GET /api/v1/workspaces/:id/projects/:projectId/api-tokens - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;
   
  console.debug(`[ApiTokensRoute] GET tokens - projectId=${projectId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const tokens = await projectApiTokenRepository.listByProject(projectId);
     
    console.info(`[ApiTokensRoute] GET tokens success - projectId=${projectId}, count=${tokens.length}`);
     
    return ApiResponse.success('API tokens retrieved', { tokens });
  } catch (e) {
     
    console.error(`[ApiTokensRoute] GET tokens error - projectId=${projectId}`, e);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/projects/:projectId/api-tokens
 */
export async function POST(request: NextRequest, { params }: Params) {
   
  console.info('[ApiTokensRoute] POST /api/v1/workspaces/:id/projects/:projectId/api-tokens - incoming request');
   
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;
  const userId = getUserId(auth.context);
   
  console.debug(`[ApiTokensRoute] POST token - projectId=${projectId}, userId=${userId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const body = await request.json();
    const { name, permissions, expiresInDays } = body;

    if (!name) {
       
      console.error('[ApiTokensRoute] POST token failed - token name is required');
      return ApiResponse.error('Token name is required', 'VALIDATION_ERROR', undefined, 400);
    }

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const { token, rawToken } = await projectApiTokenRepository.create({
      projectId,
      createdBy: userId!,
      name,
      permissions,
      expiresAt,
    });

     
    console.info(`[ApiTokensRoute] POST token success - projectId=${projectId}, tokenId=${token.id}`);
     
    return ApiResponse.success('API token created', { token, rawValue: rawToken });
  } catch (e) {
     
    console.error(`[ApiTokensRoute] POST token error - projectId=${projectId}`, e);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
