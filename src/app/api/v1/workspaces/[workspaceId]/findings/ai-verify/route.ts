import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { aiVerifySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * POST /api/v1/workspaces/:workspaceId/findings/ai-verify
 * Batch AI verification for findings.
 * Enqueues individual jobs to the queue (async) — returns immediately.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.finding.info('post request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_OVERRIDE_AI);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, aiVerifySchema);
    if (!validation.success) return validation.response;
    const { scanId, modelId, findingIds } = validation.data;

    // Enqueue individual jobs to the queue (async processing)
    const { enqueue } = await import('@/server/modules/queue/queue.service');
    const { aiVerificationRepository } = await import('@/server/modules/scan/repositories/ai-verification.repository');
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

    const model = modelId ? await aiVerificationRepository.getModelById(modelId) : await aiVerificationRepository.getPrimaryModel();
    if (!model) {
      return ApiResponse.error('No AI model configured', 'VALIDATION_ERROR', undefined, 400);
    }

    // Determine which findings to enqueue
    let idsToVerify: string[] = [];

    if (findingIds && findingIds.length > 0) {
      idsToVerify = findingIds;
    } else if (scanId) {
      // Get all open findings for the scan
      const scanFindings = await findingRepository.listByScan(scanId, { page: 1, perPage: 1000, status: 'open' });
      idsToVerify = scanFindings.data.map((f) => f.id);
    }

    if (idsToVerify.length === 0) {
      return ApiResponse.error('No findings to verify', 'VALIDATION_ERROR', undefined, 400);
    }

    let queued = 0;
    for (const findingId of idsToVerify) {
      try {
        await enqueue('ai-verify-finding', {
          findingId,
          modelId: model.id,
          workspaceId,
        }, { retryLimit: 5, retryDelay: 30 });
        queued++;
      } catch (err) {
        logger.finding.warn('Failed to enqueue AI verification', { findingId, error: (err as Error).message });
      }
    }

    logger.finding.info('AI verification enqueued', { queued, total: idsToVerify.length, scanId });
    return ApiResponse.success(`${queued} finding(s) queued for verification`, { queued, total: idsToVerify.length });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to queue verification', 'INTERNAL_ERROR', undefined, 500);
  }
}
