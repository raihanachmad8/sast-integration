import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { createAiModelSchema, aiModelListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { aiModelsService } from '@/server/modules/ai-models';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/model
 * List all AI models in a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.model.info('listAiModels');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = aiModelListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order } = parsed.data;
    const result = await aiModelsService.list(workspaceId, { page, perPage, search, sort, order });
    return ApiResponse.paginated('AI models retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (e) {
    logger.model.error('listAiModels failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:workspaceId/model
 * Create a new AI model in a workspace.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.model.info('createAiModel');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await validateBody(request, createAiModelSchema);
    if (!result.success) return result.response;

    const model = await aiModelsService.create(workspaceId, result.data, auth.context.userId);
    return ApiResponse.created('AI model created', model);
  } catch (e) {
    logger.model.error('createAiModel failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) {
      return ApiResponse.error('Invalid AI model data', 'VALIDATION_ERROR', e.flatten().fieldErrors, 400);
    }
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
