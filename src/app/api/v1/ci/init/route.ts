/**
 * CI/CD Scan Init Endpoint
 *
 * POST /api/v1/ci/init
 *
 * Creates a scan record BEFORE tools run, so all tools can upload to the same scan.
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Request Format (JSON)
 * ```json
 * {
 *   "repoName": "org/repo",
 *   "repoUrl": "https://gitea/org/repo.git",
 *   "branch": "main",
 *   "commit": "sha123"
 * }
 * ```
 */

import type { NextRequest } from 'next/server';

import { ciInitSchema } from '@/commons/schemas/ci.schema';
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
    const validation = await validateBody(request, ciInitSchema);
    if (!validation.success) return validation.response;
    const { repoName, repoUrl, branch, commit, prNumber, baseBranch, headBranch, prAuthor } = validation.data;

    logger.scan.info('CI/CD init received', {
      repoName,
      branch: branch || 'main',
      commit: commit || '',
      prNumber,
      baseBranch,
      headBranch,
      workspaceId,
      projectId,
    });

    const result = await ciCdService.initScan(workspaceId, projectId, {
      repoName,
      repoUrl,
      branch,
      commit,
      prNumber,
      baseBranch,
      headBranch,
      prAuthor,
    });

    return ApiResponse.success('Scan initialized', result);
  } catch (error) {
    const err = error as Error;
    logger.scan.error('CI/CD init failed', { error: err.message, stack: err.stack, name: err.name });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error(`Failed to initialize scan: ${err.message}`, 'INTERNAL_ERROR', undefined, 500);
  }
}
