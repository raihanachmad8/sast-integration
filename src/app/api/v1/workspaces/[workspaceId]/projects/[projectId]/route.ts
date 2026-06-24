import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { projectService } from '@/server/modules/project/services/project.service';
import { validateBody } from '@/server/http/validate';
import { projectUpdateSchema } from '@/commons/schemas/project.schema';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('getProject');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const project = await projectService.getById(projectId, auth.context.userId);
    logger.project.info('getProject completed');
    return ApiResponse.success('Project retrieved', project);
  } catch (e) {
    logger.project.error('getProject failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('updateProject');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, projectUpdateSchema);
    if (!validation.success) return validation.response;
    const project = await projectService.update(projectId, validation.data, auth.context.userId);
    logger.project.info('updateProject completed');
    return ApiResponse.success('Project updated', project);
  } catch (e) {
    logger.project.error('updateProject failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; projectId: string }> }) {
  logger.project.info('deleteProject');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, projectId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.PROJECT_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await projectService.softDelete(projectId, auth.context.userId);
    logger.project.info('deleteProject completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.project.error('deleteProject failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
