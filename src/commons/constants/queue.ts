/**
 * General-purpose constants for the background queue system (pg-boss).
 *
 * These are placed at the commons level so they can be safely imported
 * from API routes, services, jobs, and instrumentation without creating
 * circular dependencies with feature modules.
 *
 * @example
 * ```tsx
 * // Enqueue a job
 * import { QUEUE_JOBS } from '@/commons/constants/queue';
 *
 * await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, processJob);
 *
 * // Check job name
 * if (job.name === QUEUE_JOBS.RUN_MANAGED_SCAN) {
 *   // Handle managed scan
 * }
 * ```
 */

/**
 * Default schema name used by pg-boss inside Postgres.
 * All pg-boss tables are created under this schema.
 */
export const QUEUE_SCHEMA = 'pgboss';

/**
 * Default maximum concurrent connections for the queue.
 * Controls how many simultaneous database connections pg-boss can use.
 */
export const QUEUE_MAX_CONNECTIONS = 10;

/**
 * Standard job names used across the application.
 *
 * @example
 * ```tsx
 * import { QUEUE_JOBS } from '@/commons/constants/queue';
 *
 * // Register a worker
 * await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, async (job) => {
 *   await processParseScanResultJob(job);
 * });
 *
 * // Enqueue a job
 * await queue.send(QUEUE_JOBS.RUN_MANAGED_SCAN, { repositoryId, branch });
 * ```
 */
export const QUEUE_JOBS = {
  /** Parses uploaded SAST scanner results (Semgrep, Trivy, Cppcheck, etc.) */
  PARSE_SCAN_RESULT: 'parse-scan-result',
  /** Checks out an SCM repository and runs configured managed scanners */
  RUN_MANAGED_SCAN: 'run-managed-scan',
  /** Creates a managed scan from a repository schedule */
  TRIGGER_SCHEDULED_MANAGED_SCAN: 'trigger-scheduled-managed-scan',
  /** AI verification of scanner findings using LLM */
  AI_VERIFY_FINDING: 'ai-verify-finding',
  /** Cleanup old scan files based on retention policy */
  CLEANUP_OLD_SCAN_FILES: 'cleanup-old-scan-files',
  /** Backfills historical NVD CVE windows into the knowledge base */
  NVD_KNOWLEDGE_BACKFILL: 'nvd-knowledge-backfill',
  /** Periodic sync of SCM repository catalog (token refresh, rename detection, orphan cleanup) */
  SYNC_SOURCE_CONTROL: 'sync-source-control',
  /** Detects and fails orphaned scans stuck in non-terminal states */
  SCAN_TIMEOUT_WATCHDOG: 'scan-timeout-watchdog',
} as const;

/** Type representing all valid queue job names */
export type QueueJobName = (typeof QUEUE_JOBS)[keyof typeof QUEUE_JOBS];

/**
 * Default retry configuration for background jobs.
 * Failed jobs are retried up to this many times before being marked as failed.
 */
export const QUEUE_DEFAULT_RETRY_LIMIT = 3;

/**
 * Default priority for normal jobs (higher number = higher priority).
 * Use this for standard jobs. Override for urgent jobs.
 */
export const QUEUE_DEFAULT_PRIORITY = 0;
