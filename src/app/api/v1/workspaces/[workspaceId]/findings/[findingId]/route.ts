import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { updateFindingSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { findingsService } from '@/server/modules/findings';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/findings/:findingId
 * Get a single finding with AI verifications.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { workspaceId, findingId } = await params;
  logger.finding.info('get', { findingId, workspaceId });

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const finding = await findingsService.getById(workspaceId, findingId);
    return ApiResponse.success('Finding retrieved', finding);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get finding', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PATCH /api/v1/workspaces/:workspaceId/findings/:findingId
 * Update finding status, verdict, or assignment.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { workspaceId, findingId } = await params;
  logger.finding.info('update', { findingId, workspaceId });

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_TRIAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateFindingSchema);
    if (!validation.success) return validation.response;
    const { status, verdict, assignedTo } = validation.data;

    let result;
    if (verdict) {
      result = await findingsService.updateVerdict(workspaceId, findingId, verdict, userId);
    } else if (status) {
      result = await findingsService.updateStatus(workspaceId, findingId, status, userId);
    } else if (assignedTo !== undefined) {
      result = await findingsService.assign(workspaceId, findingId, assignedTo, userId);
    } else {
      return ApiResponse.error('One of status, verdict, or assignedTo is required', 'VALIDATION_ERROR', undefined, 400);
    }

    // Re-evaluate QG for the scan (non-blocking, best effort)
    findingRepository.findById(findingId).then(async (f) => {
      if (!f?.scanId) return;
      try {
        const scan = await scanRepository.getById(f.scanId);
        if (scan?.prNumber && scan?.baseBranch && scan?.headBranch && scan?.repositoryId) {
          await qualityGateService.repostPrComment(scan.id, workspaceId);
        }
      } catch (err) {
        logger.scan.warn('PATCH: QG repost failed', { findingId, error: (err as Error).message });
      }
    }).catch(() => {});

    return ApiResponse.success('Finding updated', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update finding', 'INTERNAL_ERROR', undefined, 500);
  }
}
