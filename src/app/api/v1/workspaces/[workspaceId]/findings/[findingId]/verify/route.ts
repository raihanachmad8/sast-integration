import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { aiVerificationService } from '@/server/modules/scan';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { db } from '@/server/db/client';
import { findingGroups } from '@drizzle/schema/findings';
import { eq } from 'drizzle-orm';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

const verifyFindingSchema = z.object({
  modelId: z.string().optional(),
});

/**
 * POST /api/v1/workspaces/:workspaceId/findings/:findingId/verify
 * Trigger AI verification for a single finding.
 * After verification, re-evaluates quality gate for the associated scan.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_OVERRIDE_AI);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, verifyFindingSchema);
    if (!validation.success) return validation.response;
    const { modelId } = validation.data;

    const result = await aiVerificationService.verifyFinding(findingId, modelId ?? '', workspaceId);

    // Re-evaluate QG and update inline comments for the scan (non-blocking)
    findingRepository.findById(findingId).then(async (f) => {
      if (!f?.scanId) return;
      try {
        const scan = await scanRepository.getById(f.scanId);
        if (scan?.prNumber && scan?.baseBranch && scan?.headBranch && scan?.repositoryId) {
          // repostPrComment internally calls evaluatePrScan — no need to call it separately
          await qualityGateService.repostPrComment(scan.id, workspaceId);
        }
      } catch {
        // QG re-evaluation failed silently
      }

      // Update inline comments with new verdict
      if (f?.groupId && result?.verdict) {
        try {
          const group = await db.select({ fingerprint: findingGroups.fingerprint })
            .from(findingGroups).where(eq(findingGroups.id, f.groupId)).limit(1);
          if (group[0]?.fingerprint) {
            await findingService.updateInlineCommentsForVerdict({
              fingerprint: group[0].fingerprint,
              findingId: findingId,
              filePath: f.filePath,
              lineNumber: f.lineNumber,
              scanner: f.scanner,
              message: f.message,
              severity: f.severity,
              rule: f.rule,
              groupId: f.groupId,
            }, result.verdict === 'false_positive' ? 'false_positive' : 'true_positive');

          }
        } catch (_err) {
          // inline update failed silently
        }
      }
    }).catch(() => {
      // post-mutation side effect failed silently
    });

    return ApiResponse.success('Verification completed', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to verify finding', 'INTERNAL_ERROR', undefined, 500);
  }
}
