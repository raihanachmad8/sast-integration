import type { Job } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';

interface CleanupOldScanFilesJobData {
  retentionDays: number;
}

/**
 * Executes one cleanup-old-scan-files queue job.
 * Removes scan artifacts and temporary files older than the specified retention period.
 */
export async function processCleanupOldScanFilesJob(job: Job<CleanupOldScanFilesJobData>) {
  const { retentionDays } = job.data;
  logger.queue.info('processCleanupOldScanFilesJob started', { retentionDays });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const storage = await getStorageDriver();
  let deletedFiles = 0;
  let deletedScans = 0;
  const processedScanIds = new Set<string>();

  try {
    const oldScans = await scanRepository.findOldScansWithFiles(cutoffDate, 100);

    for (const row of oldScans) {
      try {
        if (row.fileKey) {
          await storage.delete(row.fileKey);
          deletedFiles++;
        }
        processedScanIds.add(row.scanId);
      } catch (e) {
        logger.queue.error('processCleanupOldScanFilesJob: failed to delete file', { fileKey: row.fileKey, error: e instanceof Error ? e.message : e });
      }
    }

    for (const scanId of processedScanIds) {
      try {
        await scanRepository.deleteScanWithRelations(scanId);
        deletedScans++;
      } catch (e) {
        logger.queue.error('processCleanupOldScanFilesJob: failed to delete scan', { scanId, error: e instanceof Error ? e.message : e });
      }
    }

    logger.queue.info('processCleanupOldScanFilesJob completed', { retentionDays, deletedFiles, deletedScans });
    return { retentionDays, deletedFiles, deletedScans };
  } catch (e) {
    logger.queue.error('processCleanupOldScanFilesJob failed', { error: e instanceof Error ? e.message : e });
    throw e;
  }
}
