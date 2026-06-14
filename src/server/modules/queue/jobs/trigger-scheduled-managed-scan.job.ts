import type { Job } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { managedScanService, type ScheduledManagedScanJobData } from '@/server/modules/scan/services/managed-scan.service';

/**
 * Executes one trigger-scheduled-managed-scan queue job.
 * Delegates to the managed scan service to trigger a scheduled scan.
 */
export async function processTriggerScheduledManagedScanJob(job: Job<ScheduledManagedScanJobData>) {
  logger.queue.debug('processTriggerScheduledManagedScanJob', { repositoryId: job.data.repositoryId });

  await managedScanService.processScheduledManagedScanJob(job.data);

  logger.queue.debug('processTriggerScheduledManagedScanJob completed', { repositoryId: job.data.repositoryId });
}
