/**
 * Next.js instrumentation - runs once on server startup.
 * Validates environment variables early so missing config is caught immediately.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('@/server/env');
    void env.NODE_ENV;
    console.log('[env] Environment validated');

    const { QUEUE_JOBS } = await import('@/commons/constants/queue');
    const { registerWorker } = await import('@/server/modules/queue/queue.service');
    const { processNvdKnowledgeBackfillJob } = await import('@/server/modules/queue/jobs/nvd-knowledge-backfill.job');
    await registerWorker(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, async (job) => {
      await processNvdKnowledgeBackfillJob(job as Parameters<typeof processNvdKnowledgeBackfillJob>[0]);
    });
  }
}
