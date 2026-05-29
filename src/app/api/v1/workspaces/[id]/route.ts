import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { updateWorkspaceSchema } from '@/server/modules/workspace/schemas';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  try {
    const ws = await workspaceService.getById(id, auth.context.userId);
    return ApiResponse.success(WORKSPACE.MESSAGES.DETAIL, ws);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const validation = await validateBody(request, updateWorkspaceSchema);
  if (!validation.success) return validation.response;

  try {
    const ws = await workspaceService.update(id, validation.data, auth.context.userId);
    return ApiResponse.success(WORKSPACE.MESSAGES.UPDATED, ws);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  try {
    await workspaceService.delete(id, auth.context.userId);
    return ApiResponse.success(WORKSPACE.MESSAGES.DELETED, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
