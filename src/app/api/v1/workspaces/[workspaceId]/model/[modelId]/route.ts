import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { updateAiModelSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { aiModelsService } from '@/server/modules/ai-models';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; modelId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.model.info('getAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, modelId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const model = await aiModelsService.getById(workspaceId, modelId);
    logger.model.info('getAiModel completed');
    return ApiResponse.success('AI model retrieved', model);
  } catch (e) {
    logger.model.error('getAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.model.info('updateAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, modelId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateAiModelSchema);
  if (!validation.success) return validation.response;

  try {
    const model = await aiModelsService.update(workspaceId, modelId, validation.data, auth.context.userId);
    logger.model.info('updateAiModel completed');
    return ApiResponse.success('AI model updated', model);
  } catch (e) {
    logger.model.error('updateAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.model.info('deleteAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, modelId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await aiModelsService.remove(workspaceId, modelId, auth.context.userId);
    logger.model.info('deleteAiModel completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.model.error('deleteAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
