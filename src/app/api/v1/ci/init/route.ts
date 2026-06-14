/**
 * CI/CD Scan Init Endpoint
 *
 * POST /api/v1/ci/init
 *
 * Creates a scan record BEFORE tools run, so all tools can upload to the same scan.
 * This is the "legacy flow" pattern: create scan first → pass scanId to tools → tools upload to same scan.
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 * Token automatically resolves workspaceId and projectId.
 *
 * ## Flow
 * 1. Token → extract workspaceId + projectId
 * 2. Find or auto-create repository (connectionType: external)
 * 3. Find or create scan by commit SHA
 * 4. Return { scanId }
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
 *
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "scanId": "uuid"
 *   }
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { randomUUID } from 'node:crypto';
import { validateBody } from '@/server/http/validate';
import { ciInitSchema } from '@/commons/schemas/ci.schema';

export async function POST(request: NextRequest) {
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = auth.context!;

  try {
    const validation = await validateBody(request, ciInitSchema);
    if (!validation.success) return validation.response;
    const { repoName, repoUrl, branch, commit, prNumber, baseBranch, headBranch, prAuthor } = validation.data;

    const resolvedBranch = branch || 'main';
    const resolvedCommit = commit || '';

    logger.scan.info('CI/CD init received', {
      repoName,
      branch: resolvedBranch,
      commit: resolvedCommit,
      prNumber,
      baseBranch,
      headBranch,
      workspaceId,
      projectId,
    });

    // Find or auto-create repository
    let repository = await repositoriesRepository.findByNameAndWorkspace(repoName, workspaceId);

    if (!repository) {
      repository = await repositoriesRepository.create({
        workspaceId: workspaceId,
        projectId: projectId,
        name: repoName,
        url: repoUrl || `external://${repoName}`,
        defaultBranch: resolvedBranch,
        connectionType: 'external',
      });

      logger.scan.info('CI/CD init: auto-created external repository', {
        repositoryId: repository.id,
        name: repoName,
      });
    }

    // Check for existing scan by commit SHA (reuse if not terminal)
    let scan = null;
    if (resolvedCommit) {
      scan = await scanRepository.findByCommitSha(repository.id, resolvedCommit);
      if (scan && (scan.status === 'completed' || scan.status === 'failed')) {
        // Terminal state — create new scan
        scan = null;
      }
    }

    if (!scan) {
      // Create scan record (status: queued — tools haven't run yet)
      scan = await scanRepository.create({
        repositoryId: repository.id,
        branch: resolvedBranch,
        origin: 'external_upload',
        status: 'queued',
        commitSha: resolvedCommit,
        triggerSource: 'ci',
        // PR metadata
        prNumber: prNumber ?? null,
        baseBranch: baseBranch ?? null,
        headBranch: headBranch ?? null,
        prAuthor: prAuthor ?? null,
      });

      // Append triggered progress event
      await scanRepository.appendProgressEvent(scan.id, {
        id: randomUUID(),
        type: 'triggered',
        description: 'CI/CD scan initiated',
        timestamp: new Date().toISOString(),
      });

      logger.scan.info('CI/CD init: scan created', { scanId: scan.id });
    } else {
      logger.scan.info('CI/CD init: reusing existing scan', { scanId: scan.id, status: scan.status });
    }

    return ApiResponse.success('Scan initialized', { scanId: scan.id });
  } catch (error) {
    const err = error as Error;
    logger.scan.error('CI/CD init failed', { error: err.message, stack: err.stack, name: err.name });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error(`Failed to initialize scan: ${err.message}`, 'INTERNAL_ERROR', undefined, 500);
  }
}
