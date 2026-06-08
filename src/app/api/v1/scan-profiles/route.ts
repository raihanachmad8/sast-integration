import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { scanProfilesService } from '@/server/modules/scan-profiles';
import { createScanProfileSchema } from '@/commons/schemas';
import { validateBody } from '@/server/http/validate';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.SCANNER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const data = await scanProfilesService.list(workspace.context.workspaceId);
    return ApiResponse.success('Scan profiles retrieved', data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.SCANNER_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createScanProfileSchema);
  if (!validation.success) return validation.response;

  try {
    const profile = await scanProfilesService.create(
      validation.data,
      workspace.context.workspaceId,
      auth.context.userId,
    );
    return ApiResponse.created('Scan profile created', profile);
  } catch (e) {
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}
