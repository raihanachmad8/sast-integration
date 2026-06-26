/**
 * CI/CD Upload Endpoint
 *
 * POST /api/v1/ci/upload
 *
 * Accepts scan results from CI/CD pipelines (GitHub Actions, GitLab CI, Gitea Actions, etc.)
 *
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 * Token automatically resolves workspaceId and projectId.
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
 * 2. Find or auto-create repository by name/URL (connectionType: external)
 * 3. Find or create scan by commit SHA
 * 4. Parse SARIF and store findings
 * 5. Mark scan as completed
 * 6. Return { scanId, findingsCount }
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { parseScanResult } from '@/server/modules/scan/parsers';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { normalizeRepoName } from '../normalize-repo';
import { randomUUID } from 'node:crypto';

export async function POST(request: NextRequest) {
  logger.scan.info('post request');

  // Authenticate using CI/CD token → extracts workspaceId + projectId
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  const { workspaceId, projectId } = auth.context!;

  try {
    const formData = await request.formData();

    // Extract form fields
    const scanIdField = formData.get('scanId') as string | null;
    const tool = formData.get('tool') as string;
    const repoName = formData.get('repoName') as string;
    const repoUrl = (formData.get('repoUrl') as string) || '';
    const branch = (formData.get('branch') as string) || 'main';
    const commit = (formData.get('commit') as string) || '';
    const duration = parseInt((formData.get('duration') as string) || '0', 10);

    // Extract SARIF file
    const sarifFile = formData.get('sarif') as File | null;

    if (!tool) {
      return ApiResponse.error('Missing required field: tool', 'VALIDATION_ERROR', undefined, 400);
    }

    if (!sarifFile) {
      return ApiResponse.error('Missing required file: sarif', 'VALIDATION_ERROR', undefined, 400);
    }

    // scanId is required when using init pattern, repoName required for legacy
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

    // Read SARIF content
    const sarifBuffer = Buffer.from(await sarifFile.arrayBuffer());
    const sarifContent = sarifBuffer.toString('utf-8');

    let scan;

    if (scanIdField) {
      // NEW PATTERN: scanId provided (from /ci/init) — look up existing scan
      // TODO: Create scanService.getForCiUpload(scanId) to encapsulate CI scan lookup
      scan = await scanRepository.getById(scanIdField);

      if (!scan) {
        return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
      }

      // IDOR protection: ensure scan belongs to the authenticated workspace
      if (scan.repositoryId) {
        const repository = await repositoriesRepository.getById(scan.repositoryId, workspaceId);
        if (!repository) {
          return ApiResponse.error('Scan not found', 'NOT_FOUND', undefined, 404);
        }
      }

      // Update status to processing if still queued
      // TODO: Create scanService.transitionStatus(scanId, fromStatus, toStatus) for CI state machine
      if (scan.status === 'queued') {
        await scanRepository.updateStatus(scan.id, 'processing');
      }

      logger.scan.info('CI/CD upload: using existing scan', { scanId: scan.id, status: scan.status });
    } else {
      // LEGACY PATTERN: no scanId — find or create scan by commit SHA
      if (!repoName) {
        return ApiResponse.error('Missing required field: repoName', 'VALIDATION_ERROR', undefined, 400);
      }

      // Find or auto-create repository (atomic — handles concurrent requests safely)
      // TODO: Create repositoriesService.findOrCreateForCi(workspaceId, projectId, name, url, branch) to centralize CI repo resolution
      const repository = await repositoriesRepository.findOrCreate({
        workspaceId: workspaceId,
        projectId: projectId,
        name: normalizeRepoName(repoName, repoUrl),
        url: repoUrl || `external://${repoName}`,
        defaultBranch: branch,
        connectionType: ['external'],
      });

      logger.scan.info('CI/CD: repository resolved', {
        repositoryId: repository.id,
        name: repoName,
      });

      // Find or create scan for this commit
      // TODO: Create scanService.findOrCreateByCommit(repositoryId, commit, scanData) for CI scan creation
      scan = await scanRepository.findByCommitSha(repository.id, commit);

      if (!scan) {
        scan = await scanRepository.create({
          repositoryId: repository.id,
          branch,
          origin: 'external_upload',
          status: 'processing',
          commitSha: commit,
          triggerSource: 'ci',
        });

        logger.scan.info('CI/CD scan created (legacy)', { scanId: scan.id });
      }
    }

    // Parse the SARIF content
    const result = parseScanResult(tool, sarifContent, scan.id);

    // Store findings with dedup (scoped to repositoryId + scanner)
    let storedFindings: Array<{ id: string; groupId: string | null; isNew: boolean }> = [];
    if (result.findings.length > 0) {
      const findingResult = await findingService.replaceFindingsForScanJob(
        projectId,
        scan.id,
        result.findings,
        scan.repositoryId ?? null,
      );
      storedFindings = findingResult.findings ?? [];
    }

    // Store SARIF to storage for audit/re-parse
    let fileKey = '';
    try {
      const storage = await getStorageDriver();
      fileKey = `${scan.id}/${tool}-${Date.now()}.sarif`;
      await storage.upload(sarifBuffer, fileKey, { contentType: 'application/sarif+json' });
    } catch (err) {
      logger.scan.error('CI/CD upload: failed to store SARIF', { scanId: scan.id, tool, error: (err as Error).message });
    }

    // TODO: Create scanService.appendProgressEvent(scanId, event) for CI progress tracking
    await scanRepository.appendProgressEvent(scan.id, {
      id: randomUUID(),
      type: 'scanning',
      description: `${tool} uploaded (${storedFindings.length} findings)`,
      timestamp: new Date().toISOString(),
      scanner: tool,
      ...(duration > 0 ? { durationSeconds: duration } : {}),
    });

    // Record scan result with actual fileKey
    // TODO: Create scanService.recordScanResult(scanId, resultData) for CI result recording
    await scanRepository.createScanResult({
      scanId: scan.id,
      scanner: tool,
      format: 'sarif',
      fileKey: fileKey || `ci/${tool}-${Date.now()}.sarif`,
      fileSize: sarifBuffer.length,
      parsedSummary: result.summary,
    });

    // LEGACY PATTERN: mark completed if no scanId was provided (backward compat)
    // TODO: Create scanService.completeLegacyScan(scanId) to handle legacy completion flow
    if (!scanIdField) {
      await scanRepository.updateStatus(scan.id, 'completed');
      await scanRepository.appendProgressEvent(scan.id, {
        id: randomUUID(),
        type: 'completed',
        description: 'Scan completed',
        timestamp: new Date().toISOString(),
      });
    }

    logger.scan.info('CI/CD upload completed', {
      scanId: scan.id,
      tool,
      findingsCount: storedFindings.length,
    });

    return ApiResponse.success('Scan results uploaded', {
      scanId: scan.id,
      findingsCount: storedFindings.length,
    });
  } catch (error) {
    logger.scan.error('CI/CD upload failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to upload scan results', 'INTERNAL_ERROR', undefined, 500);
  }
}
