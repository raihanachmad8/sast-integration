import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { bulkUpdateFindingsSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * PUT /api/v1/workspaces/:workspaceId/findings/bulk
 * Bulk update findings (status, assignment).
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { workspaceId } = await params;
  logger.finding.info('bulk update', { workspaceId });

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_TRIAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, bulkUpdateFindingsSchema);
    if (!validation.success) return validation.response;
    const { ids, payload } = validation.data;

    let updated = 0;

    if (payload.status) {
      const scannedIds = new Set<string>();
      for (const id of ids) {
        try {
          const finding = await findingRepository.findById(id);
          if (finding?.groupId) {
            await findingRepository.updateGroupStatus(finding.groupId, payload.status, userId);
            if (finding.scanId) scannedIds.add(finding.scanId);
            updated++;
          }
        } catch {
          // Skip individual failures
        }
      }

      // Re-evaluate QG for affected scans (non-blocking)
      for (const scanId of scannedIds) {
        scanRepository.getById(scanId).then(async (scan) => {
          if (!scan?.prNumber || !scan?.baseBranch || !scan?.headBranch || !scan?.repositoryId) return;
          try {
            // repostPrComment internally calls evaluatePrScan — no need to call it separately
            await qualityGateService.repostPrComment(scan.id, workspaceId);
          } catch (err) {
            logger.scan.warn('bulk: QG re-evaluation failed', { scanId, error: (err as Error).message });
          }
        }).catch((err) => {
          logger.scan.error('bulk: QG re-evaluation post-mutation failed', { scanId, error: (err as Error).message });
        });
      }
    }

    if (payload.assignedTo !== undefined) {
      for (const id of ids) {
        try {
          await findingRepository.updateAssignment(id, payload.assignedTo);
          updated++;
        } catch {
          // Skip individual failures
        }
      }
    }

    return ApiResponse.success('Findings updated', { updated });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update findings', 'INTERNAL_ERROR', undefined, 500);
  }
}
