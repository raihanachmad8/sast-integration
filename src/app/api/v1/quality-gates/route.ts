import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { qualityGatesService } from '@/server/modules/quality-gates';
import { qualityGateConfigSchema } from '@/commons/schemas';
import { validateBody } from '@/server/http/validate';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.POLICY_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const data = await qualityGatesService.getConfig(workspace.context.workspaceId);
    return ApiResponse.success('Quality gates retrieved', data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.POLICY_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, qualityGateConfigSchema);
  if (!validation.success) return validation.response;

  try {
    const config = await qualityGatesService.updateConfig(
      validation.data,
      workspace.context.workspaceId,
      auth.context.userId,
    );
    return ApiResponse.success('Quality gates updated', config);
  } catch (e) {
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
