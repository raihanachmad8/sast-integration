/**
 * Scan upload service — handles CI/CD result uploads.
 * 
 * This service processes scan results uploaded from external CI/CD pipelines.
 * It supports both synchronous and asynchronous parsing based on payload size.
 * 
 * ## Upload Flow
 * 
 * ### 1. Validation
 * - Total upload size must not exceed 50MB (`MAX_UPLOAD_TOTAL_SIZE_BYTES`)
 * - Repository must exist or be auto-registered from `repositoryUrl`
 * 
 * ### 2. Repository Auto-registration
 * If the repository doesn't exist:
 * - Try to find by URL first (dedup)
 * - If not found, auto-create as `external` connection type
 * - This allows CI/CD to upload without prior setup
 * 
 * ### 3. Scan Creation
 * - Creates scan record with `origin: 'external_upload'`
 * - Status set to `processing`
 * 
 * ### 4. File Processing
 * For each uploaded file:
 * - Detects scanner from filename (semgrep, gitleaks, cppcheck, etc.)
 * - Uploads raw file to storage
 * - Parses synchronously if total size < 5MB (`ASYNC_PARSE_THRESHOLD_BYTES`)
 * - Enqueues parse job if total size ≥ 5MB
 * 
 * ### 5. Completion
 * - Records upload metadata (commit SHA, source, user)
 * - Marks scan as `completed`
 * 
 * ## Scanner Detection
 * 
 * Filenames are mapped to scanners:
 * - `semgrep-results.json` → semgrep
 * - `gitleaks-report.json` → gitleaks
 * - `cppcheck-results.xml` → cppcheck
 * - `flawfinder-output.sarif` → flawfinder
 * - `clang-tidy-report.txt` → clang-tidy
 * - `gcc-fanalyzer-output.txt` → gcc-fanalyzer
 * - `*.sarif` → generic SARIF parser
 * 
 * @module scan/upload
 * 
 * @example
 * ```ts
 * import { scanUploadService } from './upload.service';
 * 
 * const result = await scanUploadService.uploadScanResults({
 *   projectId: '...',
 *   repositoryUrl: 'https://github.com/org/repo',
 *   branch: 'main',
 *   commit: 'abc123',
 *   files: [{ name: 'semgrep.json', content: '{}', size: 1024 }],
 *   uploadedBy: 'user-id',
 *   source: 'github-actions',
 *   workspaceId: '...',
 * });
 * // result: { scanId: '...', findingsCount: 5 }
 * ```
 */
import { logger } from '@/server/lib/logger';
import { scanRepository } from './repositories/scan.repository';
import { findingService } from './services/finding.service';
import { parseScanResult } from './parsers';
import { MAX_UPLOAD_TOTAL_SIZE_BYTES, ASYNC_PARSE_THRESHOLD_BYTES, SCAN_PARSE_JOB_NAME, SCAN } from './constants';
import { AppError } from '@/server/http/errors';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { enqueue } from '@/server/modules/queue/queue.service';
import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { normalizeRepoName } from '@/app/api/v1/ci/normalize-repo';

export interface UploadScanResultInput {
  projectId: string;
  repositoryUrl: string;
  repositoryName?: string;
  branch: string;
  commit: string;
  files: Array<{ name: string; content: string | Buffer; size: number }>;
  uploadedBy: string;
  source: string;
  workspaceId: string;
  projectApiTokenId?: string;
  personalAccessTokenId?: string;
}

function extractScannerFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('semgrep')) return 'semgrep';
  if (lower.includes('gitleaks')) return 'gitleaks';
  if (lower.includes('cppcheck')) return 'cppcheck';
  if (lower.includes('flawfinder')) return 'flawfinder';
  if (lower.includes('clang-tidy') || lower.includes('clantidy')) return 'clang-tidy';
  if (lower.includes('gcc-fanalyzer') || lower.includes('gccfanalyzer') || lower.includes('gcc')) return 'gcc-fanalyzer';
  if (lower.endsWith('.sarif')) return 'sarif';
  return 'unknown';
}

export const scanUploadService = {
  /**
   * Handles CI/CD result uploads. Validates total size, creates a scan record,
   * persists findings with dedup, stores raw files in object storage,
   * and records the upload.
   *
   * Hybrid parsing: files below ASYNC_PARSE_THRESHOLD_BYTES are parsed
   * synchronously; larger payloads are enqueued for background processing.
   *
   * @throws {AppError} When total upload size exceeds the configured limit.
   */
  async uploadScanResults(input: UploadScanResultInput) {
    logger.scan.info('uploadScanResults', { projectId: input.projectId, fileCount: input.files.length });

    const totalSize = input.files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_UPLOAD_TOTAL_SIZE_BYTES) {
      throw new AppError(
        `Upload exceeds maximum size of ${MAX_UPLOAD_TOTAL_SIZE_BYTES / 1024 / 1024}MB`,
        413,
        SCAN.ERRORS.VALIDATION_ERROR,
      );
    }

    // Auto-register repository if it doesn't exist
    const projectId = input.projectId;
    let repositoryId: string;
    const existingRepo = await repositoriesRepository.getById(input.projectId, input.workspaceId);
    if (existingRepo) {
      repositoryId = existingRepo.id;
    } else if (input.repositoryUrl) {
      // Try to find by URL first (dedup)
      const byUrl = await repositoriesRepository.findByUrl(input.repositoryUrl, input.workspaceId);
      if (byUrl) {
        repositoryId = byUrl.id;
        logger.scan.info('uploadScanResults: matched existing repository by URL', { repositoryId, url: input.repositoryUrl });
      } else {
        // Auto-create external repository
        const rawName = input.repositoryName || input.repositoryUrl.split('/').pop()?.replace('.git', '') || 'external-repo';
        const name = input.repositoryUrl ? normalizeRepoName(rawName, input.repositoryUrl) : rawName;
        const newRepo = await repositoriesRepository.create({
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          name,
          url: input.repositoryUrl,
          defaultBranch: input.branch || 'main',
          connectionType: ['external'],
          createdBy: input.uploadedBy,
        });
        repositoryId = newRepo.id;
        logger.scan.info('uploadScanResults: auto-registered external repository', { repositoryId, name, url: input.repositoryUrl });
      }
    } else if (!existingRepo && !input.repositoryUrl) {
      throw new AppError(
        'Repository not found and no repositoryUrl provided for auto-registration',
        400,
        SCAN.ERRORS.VALIDATION_ERROR,
      );
    }

    const scan = await scanRepository.create({
      repositoryId: repositoryId!,
      branch: input.branch,
      origin: 'external_upload',
      status: 'processing',
      createdBy: input.uploadedBy,
    });

    let totalFindings = 0;
    const storage = await getStorageDriver();
    const useAsyncParsing = totalSize > ASYNC_PARSE_THRESHOLD_BYTES;

    for (const file of input.files) {
      try {
        const fileKey = `${scan.id}/${file.name}`;
        const contentBuffer = Buffer.isBuffer(file.content)
          ? file.content
          : Buffer.from(file.content, 'utf-8');
        await storage.upload(contentBuffer, fileKey, { contentType: 'application/octet-stream' });

        const scanner = extractScannerFromFileName(file.name);

        if (useAsyncParsing) {
          await enqueue(SCAN_PARSE_JOB_NAME, {
            scanId: scan.id,
            fileKey,
            scanner,
            projectId,
          });
        } else {
          const result = parseScanResult(scanner, file.content, scan.id);
          if (result.findings.length > 0) {
            await findingService.replaceFindingsForScanJob(projectId, scan.id, result.findings);
            totalFindings += result.findings.length;
          }
        }
      } catch (error) {
        logger.scan.error('uploadScanResults: failed to process file', { fileName: file.name, error });
      }
    }

    await scanRepository.createScanUpload({
      repositoryId: repositoryId!,
      projectId: projectId,
      scanId: scan.id,
      branch: input.branch,
      commitSha: input.commit,
      uploadedBy: input.uploadedBy,
      source: input.source,
      projectApiTokenId: input.projectApiTokenId,
      personalAccessTokenId: input.personalAccessTokenId,
    });

    // Only mark completed for synchronous parsing; async jobs will complete the scan
    if (!useAsyncParsing) {
      await scanRepository.updateStatus(scan.id, 'completed');
    }

    logger.scan.info('uploadScanResults completed', { scanId: scan.id, findingsCount: totalFindings });
    return { scanId: scan.id, findingsCount: totalFindings };
  },
};
