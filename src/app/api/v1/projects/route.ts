import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectService } from '@/server/modules/project/services/project.service';
import { validateBody } from '@/server/http/validate';
import { projectFormSchema } from '@/commons/schemas';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const data = await projectService.list(workspace.context.workspaceId, auth.context.userId);
    return ApiResponse.success('Projects retrieved', data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, projectFormSchema);
  if (!validation.success) return validation.response;

  try {
    const project = await projectService.create(validation.data, workspace.context.workspaceId, auth.context.userId);
    return ApiResponse.success('Project created', project);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
