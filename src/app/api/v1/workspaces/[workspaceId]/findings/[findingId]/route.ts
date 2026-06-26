import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { findingService } from '@/server/modules/scan';
import { db } from '@/server/db/client';
import { findings } from '@drizzle/schema/findings';
import { scans } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';
import { eq } from 'drizzle-orm';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

/**
 * Verify a finding belongs to the given workspace via scan → repository chain.
 * Returns the workspaceId if found, null otherwise.
 */
async function getFindingWorkspaceId(findingId: string): Promise<string | null> {
  const [result] = await db
    .select({ workspaceId: repositories.workspaceId })
    .from(findings)
    .innerJoin(scans, eq(findings.scanId, scans.id))
    .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
    .where(eq(findings.id, findingId))
    .limit(1);
  return result?.workspaceId ?? null;
}

/**
 * GET /api/v1/workspaces/:workspaceId/findings/:findingId
 * Get a single finding with AI verifications.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const finding = await findingService.getById(findingId);
    if (!finding) {
      return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
    }
    
    // IDOR check: verify the finding belongs to the workspace
    const findingWorkspace = await getFindingWorkspaceId(findingId);
    if (!findingWorkspace || findingWorkspace !== workspaceId) {
      return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
    }
    
    return ApiResponse.success('Finding retrieved', finding);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get finding', 'INTERNAL_ERROR', undefined, 500);
  }
}

const updateFindingSchema = z.object({
  status: z.string().optional(),
  verdict: z.string().optional(),
  assignedTo: z.string().optional(),
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/findings/:findingId
 * Update finding status, verdict, or assignment.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('patch request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_TRIAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateFindingSchema);
    if (!validation.success) return validation.response;
    const { status, verdict, assignedTo } = validation.data;

    // IDOR check: verify the finding belongs to the workspace before update
    const findingWorkspace = await getFindingWorkspaceId(findingId);
    if (!findingWorkspace || findingWorkspace !== workspaceId) {
      return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
    }

    let result;
    if (verdict) {
      result = await findingService.updateVerdict(findingId, verdict, userId);

      // Re-evaluate QG for the scan this finding belongs to (non-blocking)
      findingRepository.findById(findingId).then(async (f) => {
        if (!f?.scanId) return;
        try {
          const scan = await scanRepository.getById(f.scanId);
          if (scan?.prNumber && scan?.baseBranch && scan?.headBranch && scan?.repositoryId) {
            // repostPrComment internally calls evaluatePrScan — no need to call it separately
            await qualityGateService.repostPrComment(scan.id, workspaceId);
            logger.scan.info('PATCH verdict: QG re-evaluated and PR comment reposted', { scanId: scan.id });
          }
        } catch (err) {
          logger.scan.warn('PATCH verdict: QG re-evaluation failed', { error: (err as Error).message });
        }
      }).catch((err) => {
        logger.scan.error('PATCH verdict: post-mutation side effect failed', { findingId, error: (err as Error).message });
      });
    } else if (status) {
      result = await findingService.updateStatus(findingId, status, userId);

      // Re-evaluate QG for the scan this finding belongs to (non-blocking)
      findingRepository.findById(findingId).then(async (f) => {
        if (!f?.scanId) return;
        try {
          const scan = await scanRepository.getById(f.scanId);
          if (scan?.prNumber && scan?.baseBranch && scan?.headBranch && scan?.repositoryId) {
            // repostPrComment internally calls evaluatePrScan — no need to call it separately
            await qualityGateService.repostPrComment(scan.id, workspaceId);
            logger.scan.info('PATCH status: QG re-evaluated and PR comment reposted', { scanId: scan.id, status });
          }
        } catch (err) {
          logger.scan.warn('PATCH status: QG re-evaluation failed', { error: (err as Error).message });
        }
      }).catch((err) => {
        logger.scan.error('PATCH status: post-mutation side effect failed', { findingId, error: (err as Error).message });
      });
    } else if (assignedTo !== undefined) {
      result = await findingService.assign(findingId, assignedTo);
    } else {
      return ApiResponse.error('One of status, verdict, or assignedTo is required', 'VALIDATION_ERROR', undefined, 400);
    }

    return ApiResponse.success('Finding updated', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update finding', 'INTERNAL_ERROR', undefined, 500);
  }
}
