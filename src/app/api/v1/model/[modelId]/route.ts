import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { modelService } from '@/server/modules/model/model.service';
import { updateAiModelSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ modelId: string }> };

/**
 * GET /api/v1/model/:modelId
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { modelId } = await params;
  try {
    const model = await modelService.getModelById(modelId);
    return ApiResponse.success('AI model retrieved', model);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/model/:modelId
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { modelId } = await params;
  const validation = await validateBody(request, updateAiModelSchema);
  if (!validation.success) return validation.response;
  try {
    const model = await modelService.getModelById(modelId);
    const updated = await modelService.updateModel(modelId, model.workspace_id!, validation.data);
    return ApiResponse.success('AI model updated successfully', updated);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/model/:modelId
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { modelId } = await params;
  try {
    const model = await modelService.getModelById(modelId);
    await modelService.deleteModel(modelId, model.workspace_id!);
    return ApiResponse.noContent();
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
