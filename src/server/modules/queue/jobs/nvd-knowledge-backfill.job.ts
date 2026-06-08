import type { Job } from 'pg-boss';
import { knowledgeBackfillService, type NvdBackfillJobData } from '@/server/modules/knowledge-base/knowledge-backfill.service';

/**
 * Executes one NVD knowledge backfill queue job.
 *
 * @throws {AppError} When the backfill record is missing.
 */
export async function processNvdKnowledgeBackfillJob(job: Job<NvdBackfillJobData>) {
  await knowledgeBackfillService.processJob(job.data);
}
