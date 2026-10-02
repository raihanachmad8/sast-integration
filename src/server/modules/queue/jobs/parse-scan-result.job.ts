import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { parseScanResult } from '@/server/modules/scan/parsers';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { aiVerificationRepository } from '@/server/modules/scan/repositories/ai-verification.repository';
import { SCAN_PARSE_JOB_NAME } from '@/server/modules/scan/constants';
import { enqueue } from '@/server/modules/queue/queue.service';
import { QUEUE_JOBS } from '@/commons/constants/queue';

export interface ParseScanResultJobData {
  /** ID of the Scan this result belongs to */
  scanId: string;
  /** Project the scan belongs to (needed for finding group creation) */
  projectId: string;
  /** ID of the specific scan_result row (for updating parsed_summary) */
  scanResultId: string;
  /** Scanner name (semgrep, cppcheck, trivy, etc.) */
  scanner: string;
  /** Storage key of the raw report file */
  fileKey: string;
}

/**
 * Background job handler for parsing uploaded scanner reports.
 *
 * This job:
 * - Downloads the raw report from object storage
 * - Parses it using the appropriate scanner parser
 * - Creates normalized findings with deduplication
 * - Updates the scan_result with severity breakdown
 * - Marks the scan as completed (or failed on error)
 *
 * Registered automatically in instrumentation.ts on server startup.
 */
export async function processParseScanResultJob(job: { data: ParseScanResultJobData }) {
  const { scanId, projectId, scanResultId, scanner, fileKey } = job.data;

  try {
    const storage = getStorageDriver();

    // Safe download: prefer streaming when available, otherwise we accept that
    // for very large files the worker may need more memory (acceptable for v1).
    let buffer: Buffer;
    if (typeof storage.getStream === 'function') {
      const stream = await storage.getStream(fileKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      buffer = Buffer.concat(chunks);
    } else {
      // Last resort fallback (should be improved when all drivers support streaming)
      // For now we throw to force implementation of getStream on drivers.
      throw new Error(`Storage driver does not implement getStream(). Cannot process large report ${fileKey}`);
    }

    const { findings: parsedFindings, summary } = parseScanResult(scanner, buffer, scanId);

    await scanRepository.updateScanResult(scanResultId, {
      parsedSummary: {
        totalFindings: parsedFindings.length,
        severityBreakdown: summary,
      },
    });

    if (parsedFindings.length > 0) {
      const project = await projectRepository.findById(projectId);
      if (project) {
        await findingService.createManyWithDedup(
          projectId,
          scanId,
          parsedFindings.map(f => ({
            ...f,
            scan_id: scanId,
          }))
        );
      }
    }

    await scanRepository.updateStatus(scanId, 'completed');

    // Auto-trigger AI verification if findings were created and AI is enabled
    if (parsedFindings.length > 0) {
      try {
        const primaryModel = await aiVerificationRepository.getPrimaryModel('');
        if (primaryModel) {
          await enqueue(QUEUE_JOBS.AI_VERIFY_FINDING, {
            scanId,
            modelId: primaryModel.id,
          });
          console.info(`[parse-scan-result] Enqueued AI verification for scan ${scanId} with model ${primaryModel.id}`);
        }
      } catch (aiErr) {
        // AI verification is non-critical — log and continue
        console.warn(`[parse-scan-result] Failed to enqueue AI verification for scan ${scanId}:`, aiErr);
      }
    }
  } catch (error) {
    console.error(`[${SCAN_PARSE_JOB_NAME}] Failed for scanResult=${scanResultId}`, error);
    await scanRepository.updateStatus(scanId, 'failed');
    throw error;
  }
}
