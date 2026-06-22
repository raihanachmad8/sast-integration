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
    const { registerWorker, getQueue } = await import('@/server/modules/queue/queue.service');
    const { processParseScanResultJob } = await import('@/server/modules/queue/jobs/parse-scan-result.job');
    const { processRunManagedScanJob } = await import('@/server/modules/queue/jobs/run-managed-scan.job');
    const { processTriggerScheduledManagedScanJob } = await import('@/server/modules/queue/jobs/trigger-scheduled-managed-scan.job');
    const { processAiVerifyJob } = await import('@/server/modules/queue/jobs/ai-verify-finding.job');
    const { processCleanupOldScanFilesJob } = await import('@/server/modules/queue/jobs/cleanup-old-scan-files.job');
    const { processNvdKnowledgeBackfillJob } = await import('@/server/modules/queue/jobs/nvd-knowledge-backfill.job');
    const { processSyncSourceControlJob } = await import('@/server/modules/queue/jobs/sync-source-control.job');
    const { processScanTimeoutWatchdog } = await import('@/server/modules/queue/jobs/scan-timeout-watchdog.job');

    await registerWorker(QUEUE_JOBS.PARSE_SCAN_RESULT, async (job) => {
      await processParseScanResultJob(job as Parameters<typeof processParseScanResultJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.RUN_MANAGED_SCAN, async (job) => {
      await processRunManagedScanJob(job as Parameters<typeof processRunManagedScanJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, async (job) => {
      await processTriggerScheduledManagedScanJob(job as Parameters<typeof processTriggerScheduledManagedScanJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.AI_VERIFY_FINDING, async (job) => {
      await processAiVerifyJob(job as Parameters<typeof processAiVerifyJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.CLEANUP_OLD_SCAN_FILES, async (job) => {
      await processCleanupOldScanFilesJob(job as Parameters<typeof processCleanupOldScanFilesJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, async (job) => {
      await processNvdKnowledgeBackfillJob(job as Parameters<typeof processNvdKnowledgeBackfillJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.SYNC_SOURCE_CONTROL, async (job) => {
      await processSyncSourceControlJob(job as Parameters<typeof processSyncSourceControlJob>[0]);
    });
    await registerWorker(QUEUE_JOBS.SCAN_TIMEOUT_WATCHDOG, async (job) => {
      await processScanTimeoutWatchdog(job as Parameters<typeof processScanTimeoutWatchdog>[0]);
    });

    // Schedule background sync every 30 minutes
    try {
      const queue = await getQueue();
      await queue.schedule(QUEUE_JOBS.SYNC_SOURCE_CONTROL, '*/30 * * * *', {});
      console.log('[env] Scheduled SYNC_SOURCE_CONTROL every 30 minutes');
    } catch (e) {
      console.error('[env] Failed to schedule SYNC_SOURCE_CONTROL:', e);
    }

    // Schedule scan timeout watchdog every 5 minutes
    try {
      const queue = await getQueue();
      await queue.schedule(QUEUE_JOBS.SCAN_TIMEOUT_WATCHDOG, '*/5 * * * *', {});
      console.log('[env] Scheduled SCAN_TIMEOUT_WATCHDOG every 5 minutes');
    } catch (e) {
      console.error('[env] Failed to schedule SCAN_TIMEOUT_WATCHDOG:', e);
    }

    // Schedule cleanup of old scan files daily at 2 AM
    try {
      const queue = await getQueue();
      await queue.schedule(QUEUE_JOBS.CLEANUP_OLD_SCAN_FILES, '0 2 * * *', {});
      console.log('[env] Scheduled CLEANUP_OLD_SCAN_FILES daily at 2 AM');
    } catch (e) {
      console.error('[env] Failed to schedule CLEANUP_OLD_SCAN_FILES:', e);
    }
  }
}
