import { getStorageDriver } from '../storage/storage.service';
import { projectRepository } from '../project/repositories/project.repository';
import { scanRepository } from './repositories/scan.repository';
import { findingRepository } from './repositories/finding.repository';
import { aiVerificationRepository } from './repositories/ai-verification.repository';
import { parseScanResult } from './parsers';
import type { NewFinding } from '@drizzle/schema/findings';
import { enqueue } from '../queue/queue.service';
import { QUEUE_JOBS } from '@/commons/constants/queue';
import { AppError } from '@/server/http/errors';
import {
  MAX_UPLOAD_TOTAL_SIZE_BYTES,
  ASYNC_PARSE_THRESHOLD_BYTES,
  SCAN_PARSE_JOB_NAME,
  SCAN_ORIGINS,
} from './constants';
import { REPOSITORY_CONNECTION_TYPES } from '../project/constants';

export interface UploadScanResultInput {
  projectId: string;
  repositoryUrl?: string;
  repositoryName?: string;
  branch: string;
  commit: string;
  files: Array<{
    scanner: string;
    buffer: Buffer;
    originalName: string;
    contentType?: string;
  }>;
  uploadedBy: string;
  source?: string;
  /** When the upload was authenticated via a project CI token */
  projectApiTokenId?: string;
  personalAccessTokenId?: string;
}

export const scanUploadService = {
  /**
   * Handles uploading pre-generated scanner results for external (non-SCM) repositories.
   *
   * This is the primary entry point for CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
   * to submit SAST results without requiring SCM integration.
   *
   * Features:
   * - Automatic parsing of supported formats (Semgrep, Cppcheck, Trivy, Gitleaks, SARIF)
   * - Deduplication via finding groups
   * - Hybrid processing: small files are parsed synchronously, large files are queued
   * - Full audit trail via scan_uploads and project API tokens
   *
   * @param input - Upload payload containing branch, commit, files, and auth context
   * @returns Upload result summary including number of findings created
   *
   * @example
   * ```ts
   * const result = await scanUploadService.uploadResults({
   *   projectId: 'proj-123',
   *   branch: 'main',
   *   commit: 'abc123',
   *   files: [{ scanner: 'semgrep', buffer: jsonBuffer, originalName: 'semgrep.json' }],
   *   uploadedBy: userId,
   * });
   * ```
   */
  async uploadResults(input: UploadScanResultInput) {
    const { projectId, branch, commit, files, uploadedBy, source } = input;

    if (!files || files.length === 0) {
      throw new AppError('At least one scan result file is required', 400, 'VALIDATION_ERROR');
    }

    // Enforce total payload size limit (anti-abuse)
    const totalSize = files.reduce((sum, f) => sum + f.buffer.length, 0);
    if (totalSize > MAX_UPLOAD_TOTAL_SIZE_BYTES) {
      throw new AppError('Total upload size exceeds configured limit', 413, 'PAYLOAD_TOO_LARGE');
    }

    // 1. Resolve or create external repository under the project
    const repository = await this.resolveOrCreateExternalRepository(
      projectId,
      input.repositoryUrl,
      input.repositoryName,
      uploadedBy
    );

    // 2. Create Scan + ScanUpload records in a transaction-like manner
    const scan = await scanRepository.create({
      repositoryId: repository.id,
      branch,
      commitSha: commit,
      origin: SCAN_ORIGINS.EXTERNAL_UPLOAD,
      triggerSource: source || 'ci_upload',
      status: 'processing',
      createdBy: uploadedBy,
    });

    const scanUpload = await scanRepository.createScanUpload({
      repositoryId: repository.id,
      projectId,
      scanId: scan.id,
      branch,
      commitSha: commit,
      uploadedBy,
      source: source || 'ci_upload',
      projectApiTokenId: input.projectApiTokenId,
      personalAccessTokenId: input.personalAccessTokenId,
    });

    // 3. Upload + decide sync vs async (A3)
    const storage = getStorageDriver();
    const results = [];
    let totalFindingsCreated = 0;

    for (const file of files) {
      const extension = this.getExtension(file.originalName);
      const key = `uploads/${projectId}/${scan.id}/${file.scanner}-${Date.now()}.${extension}`;

      const uploadResult = await storage.upload(file.buffer, key, {
        contentType: file.contentType || 'application/octet-stream',
      });

      const isLarge = file.buffer.length > ASYNC_PARSE_THRESHOLD_BYTES;

      if (isLarge) {
        // CORRECT ORDER (fixes async path bug):
        // 1. Create scan_result record first → get real ID
        // 2. Then enqueue the job with the correct scanResultId
        const scanResult = await scanRepository.createScanResult({
          scanId: scan.id,
          scanner: file.scanner,
          format: this.detectFormat(file.originalName),
          fileKey: uploadResult.key,
          fileSize: uploadResult.size,
          parsedSummary: { status: 'queued_for_processing' },
        });
        results.push(scanResult);

        await enqueue(SCAN_PARSE_JOB_NAME, {
          scanId: scan.id,
          projectId,
          scanResultId: scanResult.id,
          scanner: file.scanner,
          fileKey: uploadResult.key,
        });
      } else {
        // Fast path: parse immediately (good for CI)
        let parsedFindings: NewFinding[] = [];
        let summary: Record<string, number> = {};

        try {
          const parseResult = parseScanResult(file.scanner, file.buffer, scan.id);
          parsedFindings = parseResult.findings;
          summary = parseResult.summary;
        } catch (parseErr) {
          console.error(`[Upload] Parse error for ${file.scanner}:`, parseErr);
        }

        const scanResult = await scanRepository.createScanResult({
          scanId: scan.id,
          scanner: file.scanner,
          format: this.detectFormat(file.originalName),
          fileKey: uploadResult.key,
          fileSize: uploadResult.size,
          parsedSummary: {
            totalFindings: parsedFindings.length,
            severityBreakdown: summary,
          },
        });

        results.push(scanResult);

        if (parsedFindings.length > 0) {
          const findingsToInsert = parsedFindings.map(f => ({ ...f, scan_id: scan.id }));
          await findingRepository.createMany(findingsToInsert);
          totalFindingsCreated += parsedFindings.length;
        }
      }
    }

    // 4. Mark scan as completed
    await scanRepository.updateStatus(scan.id, 'completed');

    // 5. Auto-trigger AI verification if findings were created
    if (totalFindingsCreated > 0) {
      try {
        const primaryModel = await aiVerificationRepository.getPrimaryModel('');
        if (primaryModel) {
          await enqueue(QUEUE_JOBS.AI_VERIFY_FINDING, {
            scanId: scan.id,
            modelId: primaryModel.id,
          });
        }
      } catch (aiErr) {
        // AI verification is non-critical — log and continue
        console.warn(`[Upload] Failed to enqueue AI verification for scan ${scan.id}:`, aiErr);
      }
    }

    return {
      success: true,
      scanId: scan.id,
      repositoryId: repository.id,
      uploadId: scanUpload.id,
      resultsCount: results.length,
      findingsCreated: totalFindingsCreated,
      message: totalFindingsCreated > 0
        ? `Scan results uploaded and ${totalFindingsCreated} findings parsed successfully.`
        : "Scan results uploaded successfully. No findings were extracted from the provided reports.",
      retentionNote: "Raw scan files will be retained for 30 days by default.",
    };
  },

  /**
   * Resolves an existing external repository for the project or auto-creates one.
   *
   * This is a key part of the "external upload" flow (SonarQube-like experience):
   * users do not need to pre-register repositories when using CI token uploads.
   *
   * @internal
   */
  async resolveOrCreateExternalRepository(
    projectId: string,
    url?: string,
    name?: string,
    createdBy?: string
  ) {
    if (!url && !name) {
      throw new AppError('repository_url or repository_name is required for external uploads', 400, 'VALIDATION_ERROR');
    }

    // Try to find existing external repository by URL (best effort)
    const existing = await projectRepository.findExternalRepositoryByUrl(projectId, url);

    if (existing) return existing;

    // Auto-create external repository (connection_type = REPOSITORY_CONNECTION_TYPES.EXTERNAL)
    const repoName = name || (url ? url.split('/').pop() || 'unknown-repo' : 'unknown-repo');

    const newRepo = await projectRepository.attachRepository(projectId, {
      name: repoName,
      url: url || '',
      defaultBranch: 'main',
      connectionType: REPOSITORY_CONNECTION_TYPES.EXTERNAL,
    }, createdBy || 'system');

    return newRepo;
  },

  /**
   * Extracts file extension (used for storage key and format detection).
   * @internal
   */
  getExtension(filename: string): string {
    return filename.split('.').pop() || 'bin';
  },

  /**
   * Detects the report format based on file extension.
   * @internal
   */
  detectFormat(filename: string): string {
    const ext = this.getExtension(filename).toLowerCase();
    if (ext === 'json') return 'json';
    if (ext === 'xml') return 'xml';
    if (ext === 'sarif') return 'sarif';
    return 'text';
  },
};
