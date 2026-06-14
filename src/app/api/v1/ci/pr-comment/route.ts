/**
 * CI/CD PR Comment Endpoint
 *
 * POST /api/v1/ci/pr-comment
 *
 * Posts a formatted scan summary as a comment on a Gitea pull request.
 * This is the SonarQube-like PR feedback mechanism.
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Request Format (JSON)
 * ```json
 * {
 *   "scanId": "uuid",
 *   "repoName": "owner/repo",
 *   "prNumber": 123
 * }
 * ```
 *
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "message": "PR comment posted",
 *   "data": { "scanId": "...", "prNumber": 123 }
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { qualityGateRepository } from '@/server/modules/scan/repositories/quality-gate.repository';
import { GiteaApiService } from '@/server/modules/source-control/gitea-api.service';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { sourceControls } from '@drizzle/schema/source-controls';
import { db } from '@/server/db/client';
import { eq } from 'drizzle-orm';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { z } from 'zod';

const prCommentSchema = z.object({
  scanId: z.string().uuid('scanId must be a valid UUID'),
  repoName: z.string().min(1, 'repoName is required'),
  prNumber: z.number().int().positive('prNumber must be a positive integer'),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context!;

  try {
    const body = await request.json();
    const validation = prCommentSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.error(
        validation.error.issues.map((e: { message: string }) => e.message).join(', '),
        'VALIDATION_ERROR',
        undefined,
        400,
      );
    }

    const { scanId, repoName, prNumber } = validation.data;

    logger.scan.info('CI/CD PR comment', { scanId, repoName, prNumber });

    // Look up scan
    const scan = await scanRepository.getById(scanId);
    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // Look up quality gate result
    const gateResult = await qualityGateRepository.getResultByScanId(scanId);

    // Get new findings (diff)
    let newFindings: Array<{
      severity: string;
      filePath: string | null;
      lineNumber: number | null;
      rule: string | null;
      message: string | null;
      scanner: string | null;
    }> = [];

    if (scan.repositoryId && scan.headBranch && scan.baseBranch) {
      const diff = await findingRepository.diffNewFindings(
        scan.repositoryId,
        scan.headBranch,
        scan.baseBranch,
        {},
        { page: 1, perPage: 20 },
      );
      newFindings = diff.data;
    }

    // Build PR comment
    const [owner, repo] = GiteaApiService.parseRepoName(repoName);
    const gateStatus = gateResult?.status ?? 'pending';
    const newCount = gateResult?.newFindings ?? 0;
    const fixedCount = gateResult?.fixedFindings ?? 0;
    const blockingCount = gateResult?.blockingFindings ?? 0;

    const commentBody = GiteaApiService.buildPrComment(
      scanId,
      gateStatus,
      newCount,
      fixedCount,
      blockingCount,
      newFindings,
    );

    // Look up Gitea credentials from source control
    const repository = scan.repositoryId
      ? await repositoriesRepository.getById(scan.repositoryId, workspaceId)
      : null;

    if (!repository) {
      return ApiResponse.error('Repository not found', 'NOT_FOUND', undefined, 404);
    }

    // Get source control credentials
    const [sourceControl] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspaceId, workspaceId))
      .limit(1);

    if (!sourceControl?.credentials) {
      return ApiResponse.error('Source control not configured', 'NOT_FOUND', undefined, 404);
    }

    const credentials = sourceControl.credentials as { baseUrl?: string; token?: string };
    if (!credentials.baseUrl || !credentials.token) {
      return ApiResponse.error('Source control credentials missing', 'NOT_FOUND', undefined, 404);
    }

    // Post PR comment
    const gitea = new GiteaApiService({
      baseUrl: credentials.baseUrl,
      token: credentials.token,
    });

    await gitea.postPrComment(owner, repo, prNumber, commentBody);

    logger.scan.info('CI/CD PR comment posted', { scanId, prNumber, gateStatus });

    return ApiResponse.success('PR comment posted', { scanId, prNumber, gateStatus });
  } catch (error) {
    logger.scan.error('CI/CD PR comment failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to post PR comment', 'INTERNAL_ERROR', undefined, 500);
  }
}
