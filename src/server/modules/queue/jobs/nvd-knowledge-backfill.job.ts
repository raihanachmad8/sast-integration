import type { Job } from 'pg-boss';

import { logger } from '@/server/lib/logger';
import { knowledgeBackfillService, type NvdBackfillJobData } from '@/server/modules/knowledge-base/knowledge-backfill.service';

/**
 * Executes one NVD knowledge backfill queue job.
 *
 * @throws {AppError} When the backfill record is missing.
 */
export async function processNvdKnowledgeBackfillJob(job: Job<NvdBackfillJobData>) {
  logger.knowledge.info('processNvdKnowledgeBackfillJob:start', { jobId: job.id });
  await knowledgeBackfillService.processJob(job.data);
  logger.knowledge.info('processNvdKnowledgeBackfillJob:completed', { jobId: job.id });
}
