import { and, desc, eq, inArray } from 'drizzle-orm';
import { knowledgeBackfillJobs, knowledgeSources } from '@drizzle/schema/integrations';
import { QUEUE_JOBS } from '@/commons/constants/queue';
import { db } from '@/server/db/client';
import { AppError } from '@/server/http/errors';
import { enqueue } from '@/server/modules/queue/queue.service';
import { syncEngine } from './sync-engine';

const DEFAULT_BACKFILL_START = new Date('2002-01-01T00:00:00.000Z');
const DEFAULT_WINDOW_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export interface NvdBackfillJobData {
  backfillJobId: string;
}

type BackfillStatus = 'queued' | 'running' | 'completed' | 'failed';

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeJob(job: typeof knowledgeBackfillJobs.$inferSelect) {
  const totalMs = Math.max(job.range_end.getTime() - job.range_start.getTime(), 1);
  const doneMs = Math.min(Math.max(job.cursor_start.getTime() - job.range_start.getTime(), 0), totalMs);

  return {
    id: job.id,
    workspaceId: job.workspace_id,
    sourceId: job.source_id,
    sourceType: job.source_type,
    status: job.status as BackfillStatus,
    rangeStart: job.range_start.toISOString(),
    rangeEnd: job.range_end.toISOString(),
    cursorStart: job.cursor_start.toISOString(),
    windowDays: job.window_days,
    importedCount: job.imported_count,
    progressPercent: Math.round((doneMs / totalMs) * 100),
    lastError: job.last_error,
    startedAt: toIso(job.started_at),
    completedAt: toIso(job.completed_at),
    createdAt: toIso(job.created_at),
    updatedAt: toIso(job.updated_at),
  };
}

export const knowledgeBackfillService = {
  /**
   * Returns the latest NVD backfill job for a workspace source.
   *
   * @throws {AppError} When the source is missing or not an NVD source.
   */
  async getLatest(workspaceId: string, sourceId: string) {
    await this.assertNvdSource(workspaceId, sourceId);

    const [job] = await db
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(eq(knowledgeBackfillJobs.workspace_id, workspaceId), eq(knowledgeBackfillJobs.source_id, sourceId)))
      .orderBy(desc(knowledgeBackfillJobs.created_at))
      .limit(1);

    return job ? serializeJob(job) : null;
  },

  /**
   * Starts a new NVD historical backfill or resumes the latest failed/incomplete job.
   *
   * @throws {AppError} When the source is missing, not NVD, or already running.
   */
  async start(workspaceId: string, sourceId: string, input?: { rangeStart?: Date; rangeEnd?: Date; windowDays?: number }) {
    await this.assertNvdSource(workspaceId, sourceId);

    const existingActive = await db
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(
        eq(knowledgeBackfillJobs.workspace_id, workspaceId),
        eq(knowledgeBackfillJobs.source_id, sourceId),
        inArray(knowledgeBackfillJobs.status, ['queued', 'running']),
      ))
      .limit(1);

    if (existingActive[0]) {
      return serializeJob(existingActive[0]);
    }

    const [failed] = await db
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(
        eq(knowledgeBackfillJobs.workspace_id, workspaceId),
        eq(knowledgeBackfillJobs.source_id, sourceId),
        eq(knowledgeBackfillJobs.status, 'failed'),
      ))
      .orderBy(desc(knowledgeBackfillJobs.updated_at))
      .limit(1);

    if (failed) {
      const [resumed] = await db
        .update(knowledgeBackfillJobs)
        .set({ status: 'queued', last_error: null, updated_at: new Date() })
        .where(eq(knowledgeBackfillJobs.id, failed.id))
        .returning();

      await enqueue(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, { backfillJobId: resumed.id });
      return serializeJob(resumed);
    }

    const rangeStart = input?.rangeStart ?? DEFAULT_BACKFILL_START;
    const rangeEnd = input?.rangeEnd ?? new Date();
    const windowDays = input?.windowDays ?? DEFAULT_WINDOW_DAYS;

    if (rangeStart >= rangeEnd) {
      throw new AppError('Backfill start date must be before end date', 400, 'VALIDATION_ERROR');
    }

    const [created] = await db
      .insert(knowledgeBackfillJobs)
      .values({
        workspace_id: workspaceId,
        source_id: sourceId,
        source_type: 'nvd',
        status: 'queued',
        range_start: rangeStart,
        range_end: rangeEnd,
        cursor_start: rangeStart,
        window_days: windowDays,
      })
      .returning();

    await enqueue(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, { backfillJobId: created.id });
    return serializeJob(created);
  },

  /**
   * Processes one NVD backfill window and queues the next window when needed.
   *
   * @throws {Error} When the sync window fails and should be retried by the queue.
   */
  async processJob(data: NvdBackfillJobData) {
    const [job] = await db
      .select()
      .from(knowledgeBackfillJobs)
      .where(eq(knowledgeBackfillJobs.id, data.backfillJobId))
      .limit(1);

    if (!job || job.status === 'completed') return;

    const now = new Date();
    const windowStart = job.cursor_start;
    const windowEnd = minDate(addDays(windowStart, job.window_days), job.range_end);

    await db
      .update(knowledgeBackfillJobs)
      .set({ status: 'running', started_at: job.started_at ?? now, updated_at: now, last_error: null })
      .where(eq(knowledgeBackfillJobs.id, job.id));

    const result = await syncEngine.syncNvdRange(job.source_id!, windowStart, windowEnd);
    const imported = result.entriesCreated + result.entriesUpdated;

    if (result.errors.length > 0) {
      const message = result.errors.slice(0, 3).join('; ');
      await db
        .update(knowledgeBackfillJobs)
        .set({ status: 'failed', last_error: message, updated_at: new Date() })
        .where(eq(knowledgeBackfillJobs.id, job.id));
      throw new Error(message);
    }

    const completed = windowEnd >= job.range_end;
    const [updated] = await db
      .update(knowledgeBackfillJobs)
      .set({
        status: completed ? 'completed' : 'queued',
        cursor_start: windowEnd,
        imported_count: job.imported_count + imported,
        completed_at: completed ? new Date() : null,
        updated_at: new Date(),
      })
      .where(eq(knowledgeBackfillJobs.id, job.id))
      .returning();

    if (!completed) {
      await enqueue(QUEUE_JOBS.NVD_KNOWLEDGE_BACKFILL, { backfillJobId: updated.id });
    }
  },

  /**
   * Verifies that a source belongs to the workspace and supports NVD backfill.
   *
   * @throws {AppError} When the source does not exist or is not NVD.
   */
  async assertNvdSource(workspaceId: string, sourceId: string) {
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.workspace_id, workspaceId)))
      .limit(1);

    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }

    if (source.type !== 'nvd') {
      throw new AppError('Historical backfill is only supported for NVD sources', 400, 'VALIDATION_ERROR');
    }

    return source;
  },
};
