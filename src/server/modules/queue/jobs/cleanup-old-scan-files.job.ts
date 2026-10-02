import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { db } from '@/server/db/client';
import { scanResults } from '@drizzle/schema/scans';
import { lt, isNotNull, and, eq } from 'drizzle-orm';
import { RETENTION_DAYS } from '@/server/modules/scan/constants';

/**
 * Input payload for the retention cleanup job.
 *
 * When `dryRun` is true, the job will only report what *would* be deleted
 * without actually calling StorageDriver.delete or mutating the database.
 * This is essential for safe manual triggering and auditing.
 */
export interface CleanupOldScanFilesJobData {
  /** If true, only simulate deletion (no side effects on storage or DB) */
  dryRun?: boolean;
  /** Optional limit override for batch size (defaults to 500 for safety) */
  limit?: number;
}

/**
 * Result summary returned by the retention cleanup job.
 * Used for logging, manual trigger responses, and future admin UI.
 */
export interface CleanupOldScanFilesJobResult {
  /** How many scan_results with file_key were considered for deletion */
  checked: number;
  /** How many files were actually deleted from storage (0 when dryRun=true) */
  deleted: number;
  /** List of error messages encountered during deletion (never throws the whole job) */
  errors: string[];
  /** The retention window used (in days) */
  retentionDays: number;
  /** Whether this run was a dry-run simulation */
  dryRun: boolean;
  /** ISO timestamp when the cleanup run finished */
  finishedAt: string;
}

/**
 * Background job: Retention cleanup for raw scan report files.
 *
 * Deletes (or simulates deletion of) raw scanner output files from object storage
 * (Local/S3/Cloudinary) that are older than the configured retention period.
 *
 * Key design points:
 * - Default retention = 30 days (centralized in RETENTION_DAYS constant)
 * - Safe batching (hard limit of 500 per run)
 * - Never crashes the whole job on single file errors
 * - Supports dry-run mode for manual inspection before real cleanup
 * - Clears `file_key` + `file_size` after successful deletion (keeps metadata + findings)
 *
 * Registered in instrumentation.ts and scheduled daily at 03:00 UTC.
 * Can also be triggered manually via future admin endpoint (see Item 2).
 *
 * @param data - Optional job data (supports dryRun for safe manual execution)
 */
export async function processCleanupOldScanFilesJob(
  data: CleanupOldScanFilesJobData = {}
): Promise<CleanupOldScanFilesJobResult> {
  const storage = getStorageDriver();
  const dryRun = data.dryRun ?? false;
  const limit = data.limit ?? 500;

  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Only consider rows that still have a file_key (raw report not yet purged)
  const oldResults = await db
    .select({
      id: scanResults.id,
      file_key: scanResults.file_key,
      scanner: scanResults.scanner,
      created_at: scanResults.created_at,
    })
    .from(scanResults)
    .where(
      and(
        lt(scanResults.created_at, cutoffDate),
        isNotNull(scanResults.file_key)
      )
    )
    .limit(limit);

  const errors: string[] = [];
  let deletedCount = 0;

  for (const result of oldResults) {
    if (!result.file_key) continue;

    try {
      if (!dryRun) {
        if (typeof storage.delete === 'function') {
          await storage.delete(result.file_key);
        }

        // Mark as purged in DB so we don't try again and so UI can show "purged"
        await db
          .update(scanResults)
          .set({ file_key: null, file_size: null })
          .where(eq(scanResults.id, result.id));
      }

      deletedCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to delete ${result.file_key} (scanner=${result.scanner}): ${message}`);
    }
  }

  return {
    checked: oldResults.length,
    deleted: dryRun ? 0 : deletedCount,
    errors,
    retentionDays: RETENTION_DAYS,
    dryRun,
    finishedAt: new Date().toISOString(),
  };
}
