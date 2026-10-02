import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';

/**
 * GET /api/v1/quality-gates/results
 *
 * List recent quality gate evaluation results for a workspace.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return ApiResponse.error('workspaceId is required', 'VALIDATION_ERROR', undefined, 422);
  }

  try {
    const results = await qualityGateService.listResults(workspaceId);
    return ApiResponse.success('Quality gate results retrieved', { results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get quality gate results';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
