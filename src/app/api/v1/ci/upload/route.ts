/**
 * CI/CD Upload Endpoint
 *
 * POST /api/v1/ci/upload
 *
 * Accepts scan results from CI/CD pipelines (GitHub Actions, GitLab CI, Gitea Actions, etc.)
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 *
 * ## Flow
 * ### With scanId (new pattern — recommended):
 * 1. Token → extract workspaceId + projectId
 * 2. Look up existing scan by scanId
 * 3. Parse SARIF and store findings
 * 4. Store SARIF to storage for audit/re-parse
 * 5. Auto-trigger AI verification
 * 6. Append progress event
 * 7. Return { scanId, findingsCount }
 *
 * ### Without scanId (legacy backward-compatible):
 * 1. Token → extract workspaceId + projectId
 * 2. Find or auto-create repository by name/URL
 * 3. Find or create scan by commit SHA
 * 4. Parse SARIF and store findings
 * 5. Mark scan as completed
 * 6. Return { scanId, findingsCount }
 */

import type { NextRequest } from 'next/server';

import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { ciCdService } from '@/server/modules/scan/services/ci-cd.service';

export async function POST(request: NextRequest) {
  logger.scan.info('post request');

  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = auth.context!;

  try {
    const formData = await request.formData();

    const scanIdField = formData.get('scanId') as string | null;
    const tool = formData.get('tool') as string;
    const repoName = formData.get('repoName') as string;
    const repoUrl = (formData.get('repoUrl') as string) || '';
    const branch = (formData.get('branch') as string) || 'main';
    const commit = (formData.get('commit') as string) || '';
    const duration = parseInt((formData.get('duration') as string) || '0', 10);

    const sarifFile = formData.get('sarif') as File | null;

    if (!tool) {
      return ApiResponse.error('Missing required field: tool', 'VALIDATION_ERROR', undefined, 400);
    }

    if (!sarifFile) {
      return ApiResponse.error('Missing required file: sarif', 'VALIDATION_ERROR', undefined, 400);
    }

    if (!scanIdField && !repoName) {
      return ApiResponse.error('Missing required field: scanId or repoName', 'VALIDATION_ERROR', undefined, 400);
    }

    logger.scan.info('CI/CD upload received', {
      scanId: scanIdField,
      tool,
      repoName,
      branch,
      commit,
      workspaceId,
      projectId,
      duration,
    });

    const sarifBuffer = Buffer.from(await sarifFile.arrayBuffer());
    const sarifContent = sarifBuffer.toString('utf-8');

    const result = await ciCdService.uploadScan(workspaceId, projectId, {
      scanId: scanIdField || undefined,
      tool,
      repoName,
      repoUrl,
      branch,
      commit,
      sarifContent,
      sarifBuffer,
      duration,
    });

    return ApiResponse.success('Scan results uploaded', result);
  } catch (error) {
    logger.scan.error('CI/CD upload failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to upload scan results', 'INTERNAL_ERROR', undefined, 500);
  }
}
