import { PgBoss, type Job as PgBossJob } from 'pg-boss';
import { env } from '@/server/env';
import {
  SCAN_PARSE_JOB_RETRY_LIMIT,
  QUEUE_JOB_NAMES,
} from '@/server/modules/scan/constants';

let bossInstance: PgBoss | null = null;
let queuesReady = false;

const REQUIRED_QUEUE_NAMES = Object.values(QUEUE_JOB_NAMES);

/**
 * Returns a singleton instance of PgBoss queue.
 *
 * The queue uses a dedicated `pgboss` schema in Postgres to avoid polluting
 * the main application schema. All scan-related background jobs (parse results,
 * retention cleanup, future scheduled scans) are managed here.
 */
export async function getQueue(): Promise<PgBoss> {
  if (bossInstance) {
    return bossInstance;
  }

  bossInstance = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: 'pgboss',
    max: 10,
  });

  bossInstance.on('error', (error) => {
    console.error('[queue] PgBoss error:', error);
  });

  await bossInstance.start();
  await ensureQueues(bossInstance);
  return bossInstance;
}

async function ensureQueues(queue: PgBoss): Promise<void> {
  if (queuesReady) {
    return;
  }

  await Promise.all(REQUIRED_QUEUE_NAMES.map((name) => queue.createQueue(name)));
  queuesReady = true;
}

/**
 * Enqueue a background job.
 *
 * Prefer using constants from `QUEUE_JOB_NAMES` (or SCAN_PARSE_JOB_NAME) for the name.
 *
 * @param name - Job name (use QUEUE_JOB_NAMES.* to avoid magic strings)
 * @param data - Job payload (will be JSON serialized)
 * @param options - Optional job configuration
 */
export async function enqueue<T = unknown>(
  name: string,
  data: T,
  options?: { priority?: number; retryLimit?: number }
): Promise<string | null> {
  const queue = await getQueue();
  await ensureQueues(queue);
  return queue.send(name, data as Record<string, unknown>, {
    retryLimit: options?.retryLimit ?? SCAN_PARSE_JOB_RETRY_LIMIT,
    priority: options?.priority ?? 0,
  });
}

/**
 * Register a worker for a specific job name.
 * Must be called once during application startup (see instrumentation.ts).
 *
 * @param name - Must match a name previously used with enqueue or schedule
 * @param handler - Async function that receives the PgBoss job
 */
export async function registerWorker(
  name: string,
  handler: (job: PgBossJob<unknown>) => Promise<void>
): Promise<void> {
  const queue = await getQueue();
  await ensureQueues(queue);
  await queue.work(name, async (job: unknown) => {
    await handler(job as PgBossJob<unknown>);
  });
}

/** Convenience re-export of the canonical cleanup job name */
export const CLEANUP_OLD_SCAN_FILES_JOB_NAME = QUEUE_JOB_NAMES.CLEANUP_OLD_SCAN_FILES;
