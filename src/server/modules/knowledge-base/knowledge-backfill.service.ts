import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { knowledgeSources } from '@drizzle/schema/integrations';
import { AppError } from '@/server/http/errors';
import { QUEUE_JOBS } from '@/commons/constants/queue';
import { enqueue } from '@/server/modules/queue/queue.service';
import { syncEngine } from './sync-engine';
import { logger } from '@/server/lib/logger';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_START = new Date('2002-01-01T00:00:00.000Z');
const DEFAULT_WINDOW_DAYS = 30;

const startBackfillSchema = z.object({
  rangeStart: z.coerce.date().optional(),
  rangeEnd: z.coerce.date().optional(),
  windowDays: z.number().int().min(1).max(120).optional(),
});

export interface NvdBackfillJobData {
  workspaceId: string;
  sourceId: string;
  rangeStart: string;
  rangeEnd: string;
  cursorStart: string;
  windowDays: number;
  importedCount: number;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function minDate(a: Date, b: Date) {
  return a.getTime() < b.getTime() ? a : b;
}

export const knowledgeBackfillService = {
  /**
   * Returns backfill jobs for a workspace source.
   *
   * @throws {AppError} When the source does not belong to the workspace.
   */
  async listJobs(workspaceId: string, sourceId: string) {
    logger.knowledge.info('listJobs', { workspaceId, sourceId });
    await assertNvdSource(workspaceId, sourceId);
    return [];
  },

  /**
   * Starts an NVD historical backfill using the pg-boss queue.
   *
   * @throws {AppError} When the source is missing, not NVD, or the date range is invalid.
   */
  async start(workspaceId: string, sourceId: string, input: unknown = {}) {
    logger.knowledge.info('start', { workspaceId, sourceId });
    await assertNvdSource(workspaceId, sourceId);
    const parsed = startBackfillSchema.parse(input);
    const rangeStart = parsed.rangeStart ?? DEFAULT_RANGE_START;
    const rangeEnd = parsed.rangeEnd ?? new Date();
    const windowDays = parsed.windowDays ?? DEFAULT_WINDOW_DAYS;

    if (rangeStart.getTime() >= rangeEnd.getTime()) {
      throw new AppError('Backfill rangeStart must be before rangeEnd', 422, 'VALIDATION_ERROR');
    }

    const jobId = await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
      workspaceId,
      sourceId,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      cursorStart: rangeStart.toISOString(),
      windowDays,
      importedCount: 0,
    });

    return { jobId, status: 'queued' };
  },

  /**
   * Processes one NVD backfill window and re-enqueues itself until the range is complete.
   */
  async processJob(data: NvdBackfillJobData) {
    logger.knowledge.info('processJob', { sourceId: data.sourceId, cursorStart: data.cursorStart });
    const cursorStart = new Date(data.cursorStart);
    const rangeEnd = new Date(data.rangeEnd);
    const windowEnd = minDate(addDays(cursorStart, data.windowDays), rangeEnd);

    const result = await syncEngine.syncNvdRange(data.sourceId, cursorStart, windowEnd);
    const nextCursor = windowEnd;
    const completed = nextCursor.getTime() >= rangeEnd.getTime();
    const newImportedCount = data.importedCount + result.entriesCreated + result.entriesUpdated;

    if (!completed) {
      await enqueue<NvdBackfillJobData>(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, {
        ...data,
        cursorStart: nextCursor.toISOString(),
        importedCount: newImportedCount,
      });
    }

    return {
      status: completed ? 'completed' : 'running',
      cursorStart: nextCursor.toISOString(),
      importedCount: newImportedCount,
      completed,
    };
  },
};

async function assertNvdSource(workspaceId: string, sourceId: string) {
  const [source] = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.workspace_id, workspaceId)))
    .limit(1);
  if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
  if (source.type !== 'nvd') throw new AppError('Backfill is only available for NVD sources', 400, 'VALIDATION_ERROR');
  return source;
}
