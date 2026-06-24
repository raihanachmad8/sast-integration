/**
 * Next.js instrumentation - runs once on server startup.
 * Validates environment variables early so missing config is caught immediately.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // ── Phase 1: Core dependencies (sequential - queue.service depends on env) ──
    const { env } = await import('@/server/env');
    void env.NODE_ENV;
    const { logger } = await import('@/server/lib/logger');
    logger.queue.info('Environment validated');

    const { QUEUE_JOBS } = await import('@/commons/constants/queue');
    const { registerWorker, getQueue } = await import('@/server/modules/queue/queue.service');

    // ── Phase 2: All job handlers (parallel - no dependencies between them) ──
    const [
      { processParseScanResultJob },
      { processRunManagedScanJob },
      { processTriggerScheduledManagedScanJob },
      { processAiVerifyJob },
      { processCleanupOldScanFilesJob },
      { processNvdKnowledgeBackfillJob },
      { processSyncSourceControlJob },
      { processScanTimeoutWatchdog },
      { processSyncKnowledgeBaseJob },
    ] = await Promise.all([
      import('@/server/modules/queue/jobs/parse-scan-result.job'),
      import('@/server/modules/queue/jobs/run-managed-scan.job'),
      import('@/server/modules/queue/jobs/trigger-scheduled-managed-scan.job'),
      import('@/server/modules/queue/jobs/ai-verify-finding.job'),
      import('@/server/modules/queue/jobs/cleanup-old-scan-files.job'),
      import('@/server/modules/queue/jobs/nvd-knowledge-backfill.job'),
      import('@/server/modules/queue/jobs/sync-source-control.job'),
      import('@/server/modules/queue/jobs/scan-timeout-watchdog.job'),
      import('@/server/modules/queue/jobs/sync-knowledge-base.job'),
    ]);

    // ── Phase 3: Register workers ──
    await registerWorker(QUEUE_JOBS.PARSE_SCAN_RESULT, async (job) => {
      await processParseScanResultJob(job as Parameters<typeof processParseScanResultJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.RUN_MANAGED_SCAN, async (job) => {
      await processRunManagedScanJob(job as Parameters<typeof processRunManagedScanJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, async (job) => {
      await processTriggerScheduledManagedScanJob(
        job as Parameters<typeof processTriggerScheduledManagedScanJob>[0]
      );
    });
    await registerWorker(QUEUE_JOBS.AI_VERIFY_FINDING, async (job) => {
      await processAiVerifyJob(job as Parameters<typeof processAiVerifyJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.CLEANUP_OLD_SCAN_FILES, async (job) => {
      await processCleanupOldScanFilesJob(
        job as Parameters<typeof processCleanupOldScanFilesJob>[0]
      );
    });
    await registerWorker(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, async (job) => {
      await processNvdKnowledgeBackfillJob(
        job as Parameters<typeof processNvdKnowledgeBackfillJob>[0]
      );
    });
    await registerWorker(QUEUE_JOBS.SYNC_SOURCE_CONTROL, async (job) => {
      await processSyncSourceControlJob(job as Parameters<typeof processSyncSourceControlJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.SCAN_TIMEOUT_WATCHDOG, async (job) => {
      await processScanTimeoutWatchdog(job as Parameters<typeof processScanTimeoutWatchdog>[0]);
    });
    await registerWorker(QUEUE_JOBS.SYNC_KNOWLEDGE_BASE, async () => {
      await processSyncKnowledgeBaseJob();
    });

    // ── Phase 4: Schedule background jobs (parallel - single queue instance) ──
    let _queue: Awaited<ReturnType<typeof getQueue>> | null = null;
    try {
      _queue = await getQueue();
      await Promise.all([
        _queue.schedule(QUEUE_JOBS.SYNC_SOURCE_CONTROL, '*/30 * * * *', {}),
        _queue.schedule(QUEUE_JOBS.SCAN_TIMEOUT_WATCHDOG, '*/5 * * * *', {}),
        _queue.schedule(QUEUE_JOBS.CLEANUP_OLD_SCAN_FILES, '0 2 * * *', {}),
        _queue.schedule(QUEUE_JOBS.SYNC_KNOWLEDGE_BASE, '0 */6 * * *', {}),
      ]);
      logger.queue.info('Scheduled all background jobs');
    } catch (e) {
      logger.queue.error('Failed to schedule background jobs', { error: (e as Error).message });
    }

    // ── Phase 5: Graceful shutdown ──
    const shutdown = async () => {
      logger.queue.info('Graceful shutdown initiated');
      try {
        if (_queue) {
          await _queue.stop();
          logger.queue.info('pg-boss stopped');
        }
      } catch (e) {
        logger.queue.error('Error stopping pg-boss', { error: (e as Error).message });
      }
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
