import { z } from 'zod';
import { knowledgeBaseRepository } from './knowledge-base.repository';
import { AppError } from '@/server/http/errors';
import { QUEUE_JOBS } from '@/commons/constants/queue';
import { enqueue } from '@/server/modules/queue/queue.service';
import { syncEngine } from './sync-engine';
import { logger } from '@/server/lib/logger';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_START = new Date('2002-01-01T00:00:00.000Z');
const DEFAULT_WINDOW_DAYS = 30;
const QUEUED_START_TIMEOUT_MS = 120 * 1000;
const RUNNING_PROGRESS_TIMEOUT_MS = 20 * 60 * 1000;
const BACKFILL_EXPIRE_SECONDS = 1800;
const DEFAULT_MAX_DURATION_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_RETRIES = 10; // Max re-enqueue attempts before pausing permanently

const startBackfillSchema = z.object({
  rangeStart: z.coerce.date().optional(),
  rangeEnd: z.coerce.date().optional(),
  windowDays: z.number().int().min(1).max(120).optional(),
  maxDurationMs: z.number().int().min(60_000).max(24 * 60 * 60 * 1000).optional(),
  maxRetries: z.number().int().min(1).max(100).optional(),
});

export interface NvdBackfillJobData {
  jobId?: string;
  backfillJobId?: string;
  workspaceId?: string;
  sourceId?: string;
  rangeStart?: string;
  rangeEnd?: string;
  cursorStart?: string;
  windowDays?: number;
  importedCount?: number;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function minDate(a: Date, b: Date) {
  return a.getTime() < b.getTime() ? a : b;
}

export const knowledgeBackfillService = {
  /**
   * Returns backfill jobs for a source, ordered by most recent first.
   */
  async listJobs(sourceId: string) {
    logger.knowledge.info('listJobs', { sourceId });
    await assertNvdSource(sourceId);
    await this.failStaleJobs(sourceId);
    const jobs = await knowledgeBaseRepository.listBackfillJobs(sourceId);
    return jobs;
  },

  /**
   * Returns the latest active queued or running job for a source.
   */
  async getActiveJob(sourceId: string) {
    return knowledgeBaseRepository.findActiveBackfillJob(sourceId);
  },

  /**
   * Starts an NVD historical backfill.
   * Creates a job record in DB, then enqueues to pg-boss.
   */
  async start(sourceId: string, input: unknown = {}) {
    logger.knowledge.info('start', { sourceId });
    const source = await assertNvdSource(sourceId);
    await this.failStaleJobs(sourceId);
    const parsed = startBackfillSchema.parse(input);
    const rangeStart = parsed.rangeStart ?? DEFAULT_RANGE_START;
    const rangeEnd = parsed.rangeEnd ?? new Date();
    const windowDays = parsed.windowDays ?? DEFAULT_WINDOW_DAYS;
    const maxDurationMs = parsed.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
    const maxRetries = parsed.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (rangeStart.getTime() >= rangeEnd.getTime()) {
      throw new AppError('Backfill rangeStart must be before rangeEnd', 422, 'VALIDATION_ERROR');
    }

    // Check for existing active job (with lock to prevent race condition)
    const activeJob = await this.getActiveJob(sourceId);
    if (activeJob) {
      // Re-enqueue if queued, then return
      if (activeJob.status === 'queued' || activeJob.status === 'running' || activeJob.status === 'paused') {
        await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
          jobId: activeJob.id,
        }, { expireInSeconds: BACKFILL_EXPIRE_SECONDS });
        logger.knowledge.info('start: existing job found, re-enqueued', { jobId: activeJob.id, status: activeJob.status });
      }
      return activeJob;
    }

    // Insert job record into DB (atomic — uses ON CONFLICT if exists)
    let job;
    try {
      job = await knowledgeBaseRepository.insertBackfillJob({
        sourceId: sourceId,
        sourceType: source.type,
        status: 'queued',
        rangeStart: rangeStart,
        rangeEnd: rangeEnd,
        cursorStart: rangeStart,
        windowDays: windowDays,
        maxDurationMs: maxDurationMs,
        maxRetries: maxRetries,
        importedCount: 0,
      });
    } catch (error) {
      // If insert fails (race condition), fetch existing job
      const existingJob = await this.getActiveJob(sourceId);
      if (existingJob) {
        logger.knowledge.info('start: race condition detected, using existing job', { jobId: existingJob.id });
        return existingJob;
      }
      throw error;
    }

    // Enqueue to pg-boss
    await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
      jobId: job.id,
    }, { expireInSeconds: BACKFILL_EXPIRE_SECONDS });

    logger.knowledge.info('start completed', { jobId: job.id });
    return job;
  },

  /**
   * Resumes a failed/queued backfill job from its last cursor position.
   */
  async resume(sourceId: string) {
    logger.knowledge.info('resume', { sourceId });
    await assertNvdSource(sourceId);
    await this.failStaleJobs(sourceId);

    // Find the latest failed or queued job
    const job = await knowledgeBaseRepository.findLatestFailedBackfillJob(sourceId);

    if (!job) {
      throw new AppError('No failed backfill job found to resume', 404, 'NOT_FOUND');
    }

    // Reset status to queued, clear error
    await knowledgeBaseRepository.updateBackfillJob(job.id, {
      status: 'queued',
      lastError: null,
    });

    // Re-enqueue from the last cursor position (do NOT reset cursorStart)
    await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
      jobId: job.id,
    }, { expireInSeconds: BACKFILL_EXPIRE_SECONDS });

    logger.knowledge.info('resume completed', { jobId: job.id, cursorStart: job.cursorStart.toISOString() });
    return { ...job, status: 'queued' as const };
  },

  /**
   * Processes one NVD backfill window and re-enqueues itself until the range is complete.
   * Updates job state in DB after each window.
   */
  async processJob(data: NvdBackfillJobData) {
    const jobId = data.jobId ?? data.backfillJobId;
    if (!jobId) throw new AppError('Knowledge backfill queue payload is missing jobId', 400, 'VALIDATION_ERROR');

    logger.knowledge.info('processJob', { jobId });

    const job = await knowledgeBaseRepository.findBackfillJobById(jobId);

    if (!job) throw new AppError('Knowledge backfill job not found', 404, 'NOT_FOUND');
    if (job.status === 'completed') return { status: 'completed' as const, importedCount: job.importedCount, completed: true };
    if (!job.sourceId) throw new AppError('Knowledge backfill job has no source', 400, 'VALIDATION_ERROR');

    // Check time limit
    const maxDurationMs = job.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
    const jobCreatedAt = job.createdAt?.getTime() ?? Date.now();
    const elapsedMs = Date.now() - jobCreatedAt;
    if (elapsedMs > maxDurationMs) {
      await knowledgeBaseRepository.updateBackfillJob(jobId, {
        status: 'paused',
        lastError: `Time limit reached (${Math.round(maxDurationMs / 60000)} minutes). Resume to continue.`,
      });
      logger.knowledge.info('processJob time limit reached', { jobId, elapsedMs, maxDurationMs });
      return { status: 'paused' as const, importedCount: job.importedCount, completed: false };
    }

    await knowledgeBaseRepository.updateBackfillJob(jobId, {
      status: 'running',
      startedAt: job.startedAt ?? new Date(),
      lastError: null,
    });

    try {
      const cursorStart = job.cursorStart;
      const rangeEnd = job.rangeEnd;
      const windowEnd = minDate(addDays(cursorStart, job.windowDays), rangeEnd);

      const result = await syncEngine.syncNvdRange(job.sourceId, cursorStart, windowEnd);
      const nextCursor = windowEnd;
      const completed = nextCursor.getTime() >= rangeEnd.getTime();
      const newImportedCount = job.importedCount + result.entriesCreated + result.entriesUpdated;

      if (completed) {
        // Mark as completed
        await knowledgeBaseRepository.updateBackfillJob(jobId, {
          status: 'completed',
          cursorStart: nextCursor,
          importedCount: newImportedCount,
          completedAt: new Date(),
        });

        logger.knowledge.info('processJob completed', { jobId, importedCount: newImportedCount });
        return { status: 'completed' as const, importedCount: newImportedCount, completed: true };
      }

      // Update cursor in DB
      await knowledgeBaseRepository.updateBackfillJob(jobId, {
        cursorStart: nextCursor,
        importedCount: newImportedCount,
      });

      // Check retry limit before re-enqueue
      const currentRetryCount = (job.retryCount ?? 0) + 1;
      const maxRetries = job.maxRetries ?? DEFAULT_MAX_RETRIES;

      if (currentRetryCount >= maxRetries) {
        await knowledgeBaseRepository.updateBackfillJob(jobId, {
          status: 'paused',
          retryCount: currentRetryCount,
          lastError: `Max retries reached (${maxRetries}). Resume to continue.`,
        });
        logger.knowledge.info('processJob max retries reached', { jobId, retryCount: currentRetryCount, maxRetries });
        return { status: 'paused' as const, importedCount: newImportedCount, completed: false };
      }

      // Update retry count
      await knowledgeBaseRepository.updateBackfillJob(jobId, {
        retryCount: currentRetryCount,
      });

      // Re-enqueue for next window
      await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
        jobId: job.id,
      }, { expireInSeconds: BACKFILL_EXPIRE_SECONDS });

      logger.knowledge.info('processJob window done, re-enqueued', { jobId, nextCursor: nextCursor.toISOString() });
      return { status: 'running' as const, importedCount: newImportedCount, completed: false };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      const windowEnd = minDate(addDays(job.cursorStart, job.windowDays), job.rangeEnd);

      // Count entries imported so far for this source (partial progress from this window)
      const partialImported = await knowledgeBaseRepository.countEntriesBySourceRaw(job.sourceId);

      // Advance cursor past the failed window so Resume skips it
      await knowledgeBaseRepository.updateBackfillJob(jobId, {
        status: 'failed',
        lastError: errorMsg,
        cursorStart: windowEnd,
        importedCount: partialImported,
      });

      logger.knowledge.error('processJob failed, partial progress saved', { jobId, error: errorMsg, cursorAdvanced: windowEnd.toISOString() });
      throw e;
    }
  },

  /**
   * Calculates backfill progress as a percentage based on date cursor.
   */
  getProgress(job: { rangeStart: Date; rangeEnd: Date; cursorStart: Date; status: string }): number {
    if (job.status === 'completed') return 100;
    const totalMs = job.rangeEnd.getTime() - job.rangeStart.getTime();
    if (totalMs <= 0) return 0;
    const currentMs = job.cursorStart.getTime() - job.rangeStart.getTime();
    return Math.min(100, Math.max(0, Math.round((currentMs / totalMs) * 100)));
  },

  /**
   * Fails stale jobs that never started or stopped updating.
   */
  async failStaleJobs(sourceId: string) {
    const jobs = await knowledgeBaseRepository.listActiveBackfillJobs(sourceId);

    const now = Date.now();
    for (const job of jobs) {
      const updatedAt = job.updatedAt?.getTime() ?? job.createdAt?.getTime() ?? now;
      const ageMs = now - updatedAt;
      const queuedTimedOut = job.status === 'queued' && !job.startedAt && ageMs > QUEUED_START_TIMEOUT_MS;
      const runningTimedOut = job.status === 'running' && ageMs > RUNNING_PROGRESS_TIMEOUT_MS;

      if (!queuedTimedOut && !runningTimedOut) continue;

      const lastError = queuedTimedOut
        ? `Backfill worker did not start within ${Math.round(QUEUED_START_TIMEOUT_MS / 1000)} seconds. The queue worker may be stopped or the queued pg-boss job failed before updating progress.`
        : `Backfill worker made no progress for ${Math.round(RUNNING_PROGRESS_TIMEOUT_MS / 60000)} minutes. Resume will continue from the last saved cursor.`;

      await knowledgeBaseRepository.updateBackfillJob(job.id, {
        status: 'failed',
        lastError: lastError,
      });
    }
  },
};

async function assertNvdSource(sourceId: string) {
  const source = await knowledgeBaseRepository.findSourceById(sourceId);
  if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
  if (source.type !== 'nvd') throw new AppError('Backfill is only available for NVD sources', 400, 'VALIDATION_ERROR');
  return source;
}
