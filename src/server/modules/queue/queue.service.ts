import { PgBoss, type Job as PgBossJob } from 'pg-boss';
import { env } from '@/server/env';
import { QUEUE_DEFAULT_PRIORITY, QUEUE_DEFAULT_RETRY_LIMIT, QUEUE_JOBS, QUEUE_MAX_CONNECTIONS, QUEUE_SCHEMA } from '@/commons/constants/queue';
import { logger } from '@/server/lib/logger';

let boss: PgBoss | null = null;
let queuesReady = false;

const REQUIRED_QUEUE_NAMES = Object.values(QUEUE_JOBS);

/**
 * Returns the singleton pg-boss instance used by background jobs.
 *
 * @throws {Error} When pg-boss cannot start with the configured DATABASE_URL.
 */
export async function getQueue() {
  if (boss) return boss;

  logger.queue.info('getQueue initializing');
  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: QUEUE_SCHEMA,
    max: QUEUE_MAX_CONNECTIONS,
  });

  boss.on('error', (error: Error) => {
    logger.queue.error('PgBoss error', { error: error.message });
  });

  await boss.start();
  await ensureQueues(boss);
  logger.queue.info('getQueue initialized');
  return boss;
}

async function ensureQueues(queue: PgBoss) {
  if (queuesReady) return;
  await Promise.all(REQUIRED_QUEUE_NAMES.map((name) => queue.createQueue(name)));
  queuesReady = true;
}

/**
 * Enqueues a background job using the shared queue instance.
 *
 * @throws {Error} When the queue is unavailable.
 */
export async function enqueue<T>(name: string, data: T, options?: { priority?: number; retryLimit?: number; retryDelay?: number; expireInSeconds?: number }) {
  logger.queue.info('enqueue', { name });
  const queue = await getQueue();
  const sendOptions: Record<string, unknown> = {
    priority: options?.priority ?? QUEUE_DEFAULT_PRIORITY,
    retryLimit: options?.retryLimit ?? QUEUE_DEFAULT_RETRY_LIMIT,
  };
  if (options?.retryDelay !== undefined) {
    sendOptions.retryDelay = options.retryDelay; // seconds between retries, exponential backoff
  }
  if (options?.expireInSeconds !== undefined) {
    sendOptions.expireInSeconds = options.expireInSeconds;
  }
  const result = await queue.send(name, data as Record<string, unknown>, sendOptions);
  logger.queue.info('enqueue completed', { name, jobId: result });
  return result;
}

/**
 * Registers a pg-boss worker. Called from instrumentation during server startup.
 *
 * @throws {Error} When the queue worker cannot be registered.
 */
export async function registerWorker(name: string, handler: (job: PgBossJob<unknown>) => Promise<void>) {
  logger.queue.info('registerWorker', { name });
  const queue = await getQueue();
  await queue.work(name, async (jobs: PgBossJob<unknown>[]) => {
    for (const job of jobs) {
      await handler(job);
    }
  });
  logger.queue.info('registerWorker completed', { name });
}
