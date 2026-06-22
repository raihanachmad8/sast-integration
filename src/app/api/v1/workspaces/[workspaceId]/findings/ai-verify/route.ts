import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { aiVerificationService } from '@/server/modules/scan';

type RouteContext = { params: Promise<{ workspaceId: string }> };

const aiVerifySchema = z.object({
  scanId: z.string().optional(),
  modelId: z.string().optional(),
  findingIds: z.array(z.string()).optional(),
});

/**
 * POST /api/v1/workspaces/:workspaceId/findings/ai-verify
 * Batch AI verification for findings in a scan.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCANNER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, aiVerifySchema);
    if (!validation.success) return validation.response;
    const { scanId, modelId, findingIds } = validation.data;

    // If scanId is provided, batch verify all findings in that scan
    if (scanId) {
      const result = await aiVerificationService.verifyFindingsBatch(scanId, modelId ?? '', workspaceId);
      return ApiResponse.success('Batch verification completed', result);
    }

    // If findingIds are provided, verify each one
    if (findingIds && findingIds.length > 0) {
      const results = [];
      for (const findingId of findingIds) {
        try {
          const result = await aiVerificationService.verifyFinding(findingId, modelId ?? '', workspaceId);
          results.push(result);
        } catch (e) {
          results.push({ findingId, error: e instanceof Error ? e.message : 'Unknown error' });
        }
      }
      return ApiResponse.success('Verification completed', results);
    }

    return ApiResponse.error('Either scanId or findingIds is required', 'VALIDATION_ERROR', undefined, 400);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to verify findings', 'INTERNAL_ERROR', undefined, 500);
  }
}
