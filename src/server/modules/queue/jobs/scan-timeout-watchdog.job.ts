/**
 * Scan Timeout Watchdog Job
 *
 * Detects and fails orphaned scans stuck in non-terminal states (queued, processing, parsing).
 * These can occur when:
 * - CI/CD pipeline crashes without calling /ci/status
 * - Managed scan job crashes after creating the scan record
 * - Queue worker dies mid-processing
 *
 * Runs every 5 minutes via pg-boss scheduled job.
 * Fails scans stuck for >30 minutes with descriptive error message.
 */

import type { Job } from 'pg-boss';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { scans } from '@drizzle/schema/scans';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { logger } from '@/server/lib/logger';
import { randomUUID } from 'node:crypto';

const TIMEOUT_MINUTES = 30;

export async function processScanTimeoutWatchdog(_job: Job) {
  logger.queue.info('scan-timeout-watchdog: starting');

  try {
    // Find scans stuck in non-terminal states for >30 minutes
    const cutoffTime = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString();

    const orphanedScans = await db
      .select({
        id: scans.id,
        status: scans.status,
        createdAt: scans.createdAt,
        repositoryId: scans.repositoryId,
      })
      .from(scans)
      .where(
        sql`${scans.status} IN ('queued', 'processing', 'parsing') 
            AND ${scans.createdAt} < ${cutoffTime}`
      );

    if (orphanedScans.length === 0) {
      logger.queue.debug('scan-timeout-watchdog: no orphaned scans found');
      return;
    }

    logger.queue.warn('scan-timeout-watchdog: found orphaned scans', { count: orphanedScans.length });

    for (const scan of orphanedScans) {
      try {
        // Mark as failed with descriptive message
        await scanRepository.updateStatus(scan.id, 'failed');
        await scanRepository.appendProgressEvent(scan.id, {
          id: randomUUID(),
          type: 'failed',
          description: `Scan timed out after ${TIMEOUT_MINUTES} minutes in "${scan.status}" state. Possible causes: CI/CD pipeline crashed, queue worker died, or server restarted during scan.`,
          timestamp: new Date().toISOString(),
        });

        logger.queue.warn('scan-timeout-watchdog: marked scan as failed', {
          scanId: scan.id,
          status: scan.status,
          createdAt: scan.createdAt,
        });
      } catch (err) {
        logger.queue.error('scan-timeout-watchdog: failed to mark scan', {
          scanId: scan.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.queue.info('scan-timeout-watchdog: completed', { processed: orphanedScans.length });
  } catch (err) {
    logger.queue.error('scan-timeout-watchdog: failed', { error: err instanceof Error ? err.message : String(err) });
  }
}
