import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { workspaceCreateSchema as createWorkspaceSchema } from '@/commons/schemas';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  logger.workspace.info('listWorkspaces');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const workspaces = await workspaceService.list(auth.context.userId);
    logger.workspace.info('listWorkspaces completed');
    return ApiResponse.success(WORKSPACE.MESSAGES.LIST, workspaces);
  } catch (e) {
    logger.workspace.error('listWorkspaces failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  logger.workspace.info('createWorkspace');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, createWorkspaceSchema);
  if (!validation.success) return validation.response;

  try {
    const ws = await workspaceService.create(validation.data, auth.context.userId);
    logger.workspace.info('createWorkspace completed');
    return ApiResponse.created(WORKSPACE.MESSAGES.CREATED, ws);
  } catch (e) {
    logger.workspace.error('createWorkspace failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
