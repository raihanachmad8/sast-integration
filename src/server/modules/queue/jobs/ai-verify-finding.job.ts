import type { JobWithMetadata } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { aiVerificationService } from '@/server/modules/scan/services/ai-verification.service';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';

interface AiVerifyJobData {
  scanId?: string;
  findingId?: string;
  modelId: string;
}

/**
 * Executes one AI verification queue job.
 * Supports both batch verification (by scanId) and single finding verification (by findingId).
 *
 * Retry behavior:
 * - pg-boss retries with exponential backoff (30s, 1m, 2m, 5m, 10m)
 * - After all retries exhausted, finding status is set to 'needs_reverify'
 * - User can manually re-trigger from findings page
 */
export async function processAiVerifyJob(job: JobWithMetadata<AiVerifyJobData>) {
  const { scanId, findingId, modelId } = job.data;
  logger.queue.debug('processAiVerifyJob', { scanId, findingId, modelId, attempt: job.retryCount });

  try {
    if (scanId) {
      const result = await aiVerificationService.verifyFindingsBatch(scanId, modelId);
      logger.queue.debug('processAiVerifyJob batch completed', { scanId, verified: result.verified, failed: result.failed });
    } else if (findingId) {
      await aiVerificationService.verifyFinding(findingId, modelId);
      logger.queue.debug('processAiVerifyJob single completed', { findingId });
    } else {
      logger.queue.error('processAiVerifyJob: no scanId or findingId provided', { jobData: job.data });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.queue.error('processAiVerifyJob failed', { scanId, findingId, message, attempt: job.retryCount });

    // If this is the last retry, mark finding as needing re-verification
    const isLastRetry = job.retryCount >= (job.retryLimit ?? 5);
    if (isLastRetry && findingId) {
      try {
        // Update finding status to 'needs_reverify' so user knows to re-trigger
        await findingRepository.updateStatus(findingId, 'needs_reverify', 'system');
        logger.queue.info('processAiVerifyJob: finding marked needs_reverify', { findingId });
      } catch (statusError) {
        logger.queue.error('processAiVerifyJob: failed to update finding status', { findingId, error: statusError instanceof Error ? statusError.message : String(statusError) });
      }
    }

    // Re-throw to trigger pg-boss retry
    throw error;
  }
}
