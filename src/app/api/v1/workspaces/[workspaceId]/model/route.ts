import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { aiModelsService } from '@/server/modules/ai-models';
import { createAiModelSchema } from '@/commons/schemas';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.model.info('listAiModels');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const data = await aiModelsService.listModelsByWorkspace(workspaceId);
    logger.model.info('listAiModels completed');
    return ApiResponse.success('AI models retrieved', data);
  } catch (e) {
    logger.model.error('listAiModels failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.model.info('createAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createAiModelSchema);
  if (!validation.success) return validation.response;

  try {
    const model = await aiModelsService.createModel(workspaceId, validation.data, auth.context.userId);
    logger.model.info('createAiModel completed');
    return ApiResponse.created('AI model created', model);
  } catch (e) {
    logger.model.error('createAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
