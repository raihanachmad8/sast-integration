/**
 * Scan Timeout Watchdog Job
 *
 * Detects and fails orphaned scans stuck in non-terminal states (queued, processing, parsing).
 * These can occur when:
 * - CI/CD pipeline crashes without calling /ci/complete
 * - Managed scan job crashes after creating the scan record
 * - Queue worker dies mid-processing
 *
 * Runs every 5 minutes via pg-boss scheduled job.
 * Fails scans stuck for >30 minutes with descriptive error message.
 */

import type { Job } from 'pg-boss';
import { sql, inArray } from 'drizzle-orm';
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

    // Batch: get finding counts for all orphaned scans
    const scanIds = orphanedScans.map((s) => s.id);
    const findingCounts = await db.execute<{ scanId: string; count: number }>(
      sql`SELECT "scanId" as "scanId", count(*)::int as count FROM findings WHERE "scanId" IN ${sql`(${sql.join(scanIds.map((id) => sql`${id}`), sql`, `)})`} GROUP BY "scanId"`
    );
    const findingCountMap = new Map(findingCounts.map((r) => [r.scanId, r.count]));

    // Separate scans into completed (has findings) vs failed (no findings)
    const completedScanIds: string[] = [];
    const failedScanIds: string[] = [];
    for (const scan of orphanedScans) {
      const count = findingCountMap.get(scan.id) ?? 0;
      if (count > 0) {
        completedScanIds.push(scan.id);
      } else {
        failedScanIds.push(scan.id);
      }
    }

    const now = new Date();

    // Batch update scans with findings → completed
    if (completedScanIds.length > 0) {
      await db.update(scans).set({ status: 'completed', completedAt: now })
        .where(inArray(scans.id, completedScanIds));
    }

    // Batch update scans without findings → failed
    if (failedScanIds.length > 0) {
      await db.update(scans).set({ status: 'failed', completedAt: now })
        .where(inArray(scans.id, failedScanIds));
    }

    // Append individual progress events (each scan needs its own description)
    for (const scan of orphanedScans) {
      const findingCount = findingCountMap.get(scan.id) ?? 0;
      const targetStatus = findingCount > 0 ? 'completed' : 'failed';
      const reason = findingCount > 0
        ? `Scan had ${findingCount} findings — marking as completed (parsing finished but status never updated)`
        : `Scan timed out after ${TIMEOUT_MINUTES} minutes in "${scan.status}" state. Possible causes: CI/CD pipeline crashed, queue worker died, or server restarted during scan.`;

      await scanRepository.appendProgressEvent(scan.id, {
        id: randomUUID(),
        type: targetStatus === 'completed' ? 'completed' : 'failed',
        description: reason,
        timestamp: now.toISOString(),
      });

      logger.queue.warn('scan-timeout-watchdog: marked scan', {
        scanId: scan.id,
        previousStatus: scan.status,
        newStatus: targetStatus,
        findingCount,
        createdAt: scan.createdAt,
      });
    }

    logger.queue.info('scan-timeout-watchdog: completed', { processed: orphanedScans.length });
  } catch (err) {
    logger.queue.error('scan-timeout-watchdog: failed', { error: err instanceof Error ? err.message : String(err) });
  }
}
