/**
 * CI/CD Complete Endpoint
 *
 * POST /api/v1/ci/complete
 *
 * Finalizes a scan from CI/CD pipelines and evaluates quality gate.
 * For PR scans, evaluates only NEW findings (SonarQube-like behavior).
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Request Format (JSON)
 * ```json
 * {
 *   "scanId": "uuid",
 *   "status": "completed" | "failed",
 *   "message": "All tools completed",
 *   "totalFindings": 15,
 *   "totalDuration": 45,
 *   "successRate": 4,
 *   "tools": ["cppcheck", "flawfinder", "clang-tidy", "gcc-analyzer"],
 *   "platform": "gitea",
 *   "trigger": "ci"
 * }
 * ```
 *
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "message": "Scan completed",
 *   "data": {
 *     "scanId": "uuid",
 *     "status": "completed",
 *     "qualityGate": {
 *       "status": "passed|failed|warning",
 *       "newFindings": 3,
 *       "fixedFindings": 1,
 *       "blockingFindings": 1,
 *       "pendingFindings": 0
 *     }
 *   }
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { randomUUID } from 'node:crypto';
import { validateBody } from '@/server/http/validate';
import { ciCompleteSchema } from '@/commons/schemas/ci.schema';

export async function POST(request: NextRequest) {
  // Authenticate using CI/CD token
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = auth.context!;

  try {
    const validation = await validateBody(request, ciCompleteSchema);
    if (!validation.success) return validation.response;
    const {
      scanId,
      status,
      message,
      totalFindings,
      totalDuration,
      successRate,
      tools,
      platform,
      trigger,
    } = validation.data;

    logger.scan.info('CI/CD complete', {
      scanId,
      status,
      totalFindings,
      totalDuration,
      tools,
      platform,
    });

    // Look up scan to check for PR metadata
    const scan = await scanRepository.getById(scanId);
    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // Update scan status
    await scanRepository.updateStatus(scanId, status || 'completed');

    // Append completion event
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: 'completed',
      description: message || 'CI/CD scan completed',
      timestamp: new Date().toISOString(),
    });

    // Store summary in scan result
    await scanRepository.createScanResult({
      scanId: scanId,
      scanner: 'ci-cd',
      format: 'json',
      parsedSummary: {
        totalFindings,
        totalDuration,
        successRate,
        tools,
        platform,
        trigger,
      },
    });

    // Evaluate quality gate
    let gateResult = null;
    if (scan.prNumber && scan.baseBranch && scan.headBranch && scan.repositoryId) {
      // PR scan — evaluate only NEW findings (SonarQube-like)
      gateResult = await qualityGateService.evaluatePrScan(
        scanId,
        workspaceId,
        scan.repositoryId,
        scan.headBranch,
        scan.baseBranch,
      );
    } else if (projectId) {
      // Regular scan — evaluate all findings
      gateResult = await qualityGateService.evaluateScan(scanId, workspaceId, projectId);
    }

    logger.scan.info('CI/CD scan completed', { scanId, status, totalFindings, gateStatus: gateResult?.status });

    return ApiResponse.success('Scan completed', {
      scanId,
      status,
      qualityGate: gateResult ? {
        status: gateResult.status,
        newFindings: (gateResult as { pr?: { newFindings?: number } }).pr?.newFindings ?? 0,
        fixedFindings: (gateResult as { pr?: { fixedFindings?: number } }).pr?.fixedFindings ?? 0,
        blockingFindings: gateResult.findings.blocking,
        pendingFindings: gateResult.findings.pending,
      } : null,
    });
  } catch (error) {
    logger.scan.error('CI/CD complete failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to complete scan', 'INTERNAL_ERROR', undefined, 500);
  }
}
