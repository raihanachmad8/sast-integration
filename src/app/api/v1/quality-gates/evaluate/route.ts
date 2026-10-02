import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { evaluateQualityGateSchema } from '@/commons/schemas';

/**
 * POST /api/v1/quality-gates/evaluate
 *
 * Evaluate quality gate for a scan.
 * Checks findings against the gate rules and returns pass/fail/warning status.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const validation = await validateBody(request, evaluateQualityGateSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await qualityGateService.evaluate(
      validation.data.scanId,
      validation.data.workspaceId
    );

    return ApiResponse.success('Quality gate evaluated', result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to evaluate quality gate';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}
