import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { aiVerificationService } from '@/server/modules/scan';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

const verifyFindingSchema = z.object({
  modelId: z.string().optional(),
});

/**
 * POST /api/v1/workspaces/:workspaceId/findings/:findingId/verify
 * Trigger AI verification for a single finding.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCANNER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, verifyFindingSchema);
    if (!validation.success) return validation.response;
    const { modelId } = validation.data;

    const result = await aiVerificationService.verifyFinding(findingId, modelId ?? '');
    return ApiResponse.success('Verification completed', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to verify finding', 'INTERNAL_ERROR', undefined, 500);
  }
}
