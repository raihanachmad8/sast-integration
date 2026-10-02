import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { updateQualityGateSchema } from '@/commons/schemas';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

/**
 * GET /api/v1/quality-gates
 *
 * Get quality gate configuration for a workspace.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return ApiResponse.error('workspaceId is required', 'VALIDATION_ERROR', undefined, 422);
  }

  try {
    const config = await qualityGateService.getConfig(workspaceId);
    return ApiResponse.success('Quality gate config retrieved', config);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get quality gate config';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/quality-gates
 *
 * Update quality gate configuration.
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const validation = await validateBody(request, updateQualityGateSchema);
  if (!validation.success) return validation.response;

  try {
    const { workspaceId, ...data } = validation.data;
    const config = await qualityGateService.updateConfig(workspaceId, data);
    return ApiResponse.success('Quality gate config updated', config);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update quality gate config';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
