/**
 * CI/CD Commit Status Endpoint
 *
 * POST /api/v1/ci/commit-status
 *
 * Sets a commit status on Gitea based on quality gate result.
 * This enables branch protection rules and PR status checks.
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Request Format (JSON)
 * ```json
 * {
 *   "scanId": "uuid",
 *   "repoName": "owner/repo",
 *   "commitSha": "abc123..."
 * }
 * ```
 *
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "message": "Commit status set",
 *   "data": { "scanId": "...", "status": "success", "context": "sast-integration/gate" }
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { qualityGateRepository } from '@/server/modules/scan/repositories/quality-gate.repository';
import { GiteaApiService } from '@/server/modules/source-control/gitea-api.service';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { sourceControls } from '@drizzle/schema/source-controls';
import { db } from '@/server/db/client';
import { eq } from 'drizzle-orm';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { z } from 'zod';

const commitStatusSchema = z.object({
  scanId: z.string().uuid('scanId must be a valid UUID'),
  repoName: z.string().min(1, 'repoName is required'),
  commitSha: z.string().min(1, 'commitSha is required'),
});

const STATUS_CONTEXT = 'sast-integration/gate';

export async function POST(request: NextRequest) {
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId } = auth.context!;

  try {
    const body = await request.json();
    const validation = commitStatusSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.error(
        validation.error.issues.map((e: { message: string }) => e.message).join(', '),
        'VALIDATION_ERROR',
        undefined,
        400,
      );
    }

    const { scanId, repoName, commitSha } = validation.data;

    logger.scan.info('CI/CD commit status', { scanId, repoName, commitSha });

    // Look up scan
    const scan = await scanRepository.getById(scanId);
    if (!scan) {
      return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
    }

    // Look up quality gate result
    const gateResult = await qualityGateRepository.getResultByScanId(scanId);

    // Map gate status to commit status
    let commitStatus: 'pending' | 'success' | 'failure' | 'error';
    let description: string;

    if (!gateResult) {
      commitStatus = 'pending';
      description = 'Scan completed, quality gate pending';
    } else if (gateResult.status === 'passed') {
      commitStatus = 'success';
      const newCount = gateResult.newFindings ?? 0;
      description = newCount > 0
        ? `${newCount} new finding(s) — quality gate passed`
        : 'No new findings — quality gate passed';
    } else if (gateResult.status === 'failed') {
      commitStatus = 'failure';
      const blocking = gateResult.blockingFindings ?? 0;
      description = `${blocking} blocking finding(s) — quality gate failed`;
    } else {
      commitStatus = 'success';
      description = 'Quality gate passed with warnings';
    }

    // Look up source control credentials
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

    // Parse repo name and set commit status
    const [owner, repo] = GiteaApiService.parseRepoName(repoName);
    const gitea = new GiteaApiService({
      baseUrl: credentials.baseUrl,
      token: credentials.token,
    });

    await gitea.createCommitStatus(owner, repo, commitSha, {
      status: commitStatus,
      description,
      context: STATUS_CONTEXT,
      targetUrl: `${credentials.baseUrl}/${repoName}/src/commit/${commitSha}`,
    });

    logger.scan.info('CI/CD commit status set', { scanId, commitSha, status: commitStatus });

    return ApiResponse.success('Commit status set', { scanId, status: commitStatus, context: STATUS_CONTEXT });
  } catch (error) {
    logger.scan.error('CI/CD commit status failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to set commit status', 'INTERNAL_ERROR', undefined, 500);
  }
}
