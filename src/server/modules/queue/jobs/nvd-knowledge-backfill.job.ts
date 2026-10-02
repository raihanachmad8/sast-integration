import { knowledgeBackfillService, type NvdBackfillJobData } from '@/server/modules/knowledge-base/knowledge-backfill.service';

/**
 * Processes one historical NVD backfill window.
 *
 * @throws {Error} Propagates worker failures so pg-boss can retry the window.
 */
export async function processNvdKnowledgeBackfillJob(job: { data: NvdBackfillJobData }) {
  await knowledgeBackfillService.processJob(job.data);
}
