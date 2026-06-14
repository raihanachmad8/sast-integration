import type { Job } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { managedScanService, type ManagedScanJobData } from '@/server/modules/scan/services/managed-scan.service';

/**
 * Executes one run-managed-scan queue job.
 * Clones the repository, runs configured scanners, and persists results.
 */
export async function processRunManagedScanJob(job: Job<ManagedScanJobData>) {
  logger.queue.debug('processRunManagedScanJob', { scanId: job.data.scanId, repositoryId: job.data.repositoryId });

  await managedScanService.processManagedScanJob(job.data);

  logger.queue.debug('processRunManagedScanJob completed', { scanId: job.data.scanId });
}
