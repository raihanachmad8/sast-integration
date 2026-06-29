/**
 * CI/CD Complete Endpoint
 *
 * POST /api/v1/ci/complete
 *
 * Finalizes a scan from CI/CD pipelines:
 * 1. Updates scan status
 * 2. Posts inline comments (fast feedback)
 * 3. Evaluates quality gate (final verdict)
 * 4. Posts PR comment (final summary)
 * 5. Sets commit status (for branch protection)
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
 */

import type { NextRequest } from 'next/server';

import { ciCompleteSchema } from '@/commons/schemas/ci.schema';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { ciCdService } from '@/server/modules/scan/services/ci-cd.service';

export async function POST(request: NextRequest) {
  logger.scan.info('post request');

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

    logger.scan.info('CI/CD complete', { scanId, status, totalFindings, tools, platform });

    const result = await ciCdService.completeScan(workspaceId, projectId, {
      scanId,
      status,
      message,
      totalFindings,
      totalDuration,
      successRate,
      tools,
      platform,
      trigger,
    });

    return ApiResponse.success('Scan completed', result);
  } catch (error) {
    logger.scan.error('CI/CD complete failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to complete scan', 'INTERNAL_ERROR', undefined, 500);
  }
}
