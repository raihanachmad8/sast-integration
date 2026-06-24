import type { Job } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { managedScanService, type ManagedScanJobData } from '@/server/modules/scan/services/managed-scan.service';

/**
 * Executes one run-managed-scan queue job.
 * Clones the repository, runs configured scanners, and persists results.
 */
export async function processRunManagedScanJob(job: Job<ManagedScanJobData>) {
  const { scanId, repositoryId } = job.data;
  logger.queue.debug('processRunManagedScanJob', { scanId, repositoryId });

  try {
    await managedScanService.processManagedScanJob(job.data);
    logger.queue.debug('processRunManagedScanJob completed', { scanId });
  } catch (err) {
    logger.queue.error('processRunManagedScanJob failed', {
      scanId,
      repositoryId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
    });
    throw err;
  }
}
