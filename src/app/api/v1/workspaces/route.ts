import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { createWorkspaceSchema } from '@/server/modules/workspace/schemas';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { AppError } from '@/server/http/errors';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspaces = await workspaceService.list(auth.context.userId);
  return ApiResponse.success(WORKSPACE.MESSAGES.LIST, workspaces);
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, createWorkspaceSchema);
  if (!validation.success) return validation.response;

  try {
    const ws = await workspaceService.create(validation.data, auth.context.userId);
    return ApiResponse.created(WORKSPACE.MESSAGES.CREATED, ws);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
