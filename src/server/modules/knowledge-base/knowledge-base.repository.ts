import { and, eq, count, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources, knowledgeBackfillJobs } from '@drizzle/schema/integrations';
import { logger } from '@/server/lib/logger';
const entrySelectFields = {
  id: knowledgeEntries.id,
  sourceId: knowledgeEntries.sourceId,
  cweId: knowledgeEntries.cweId,
  title: knowledgeEntries.title,
  content: knowledgeEntries.content,
  severity: knowledgeEntries.severity,
  remediation: knowledgeEntries.remediation,
  tags: knowledgeEntries.tags,
  muted: knowledgeEntries.muted,
  usedByAiCount: knowledgeEntries.usedByAiCount,
  references: knowledgeEntries.references,
  createdAt: knowledgeEntries.createdAt,
  updatedAt: knowledgeEntries.updatedAt,
  sourceName: knowledgeSources.name,
  sourceType: knowledgeSources.type,
} as const;

export const knowledgeBaseRepository = {
  // ── Knowledge Entries ──────────────────────────────────────────────

  /**
   * Count entries matching conditions (global — not workspace-scoped).
   */
  async countEntries(
    params: { search?: string; source?: string },
    tx?: Tx,
  ): Promise<number> {
    const executor = tx ?? db;
    const conditions: ReturnType<typeof and> extends infer R ? R[] : never = [];

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(knowledgeEntries.title, q),
          ilike(knowledgeEntries.cweId, q),
          ilike(knowledgeEntries.content, q),
          sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${knowledgeEntries.tags}) AS tag WHERE tag ILIKE ${q})`,
        )!,
      );
    }

    if (params.source) {
      conditions.push(eq(knowledgeSources.type, params.source));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ total }] = await executor
      .select({ total: count() })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(where);

    return total;
  },

  /**
   * List entries (global — not workspace-scoped), ordered by title.
   */
  async listEntries(
    params: { search?: string; source?: string; limit: number; offset: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const conditions: ReturnType<typeof and> extends infer R ? R[] : never = [];

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(knowledgeEntries.title, q),
          ilike(knowledgeEntries.cweId, q),
          ilike(knowledgeEntries.content, q),
          sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${knowledgeEntries.tags}) AS tag WHERE tag ILIKE ${q})`,
        )!,
      );
    }

    if (params.source) {
      conditions.push(eq(knowledgeSources.type, params.source));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return executor
      .select(entrySelectFields)
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(where)
      .orderBy(knowledgeEntries.title)
      .limit(params.limit)
      .offset(params.offset);
  },

  /**
   * Get a single entry by ID (global — not workspace-scoped).
   */
  async findEntryById(entryId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [entry] = await executor
      .select(entrySelectFields)
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(eq(knowledgeEntries.id, entryId))
      .limit(1);
    return entry ?? null;
  },

  /**
   * Get entry by ID (alias for backward compatibility).
   */
  async findEntryForWorkspace(entryId: string, _workspaceId: string, tx?: Tx) {
    return this.findEntryById(entryId, tx);
  },

  /**
   * Insert a knowledge entry.
   */
  async insertEntry(data: {
    sourceId: string;
    cweId?: string;
    title: string;
    content?: string;
    severity?: string;
    remediation?: string;
    tags?: string[];
    muted?: boolean;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [entry] = await executor
      .insert(knowledgeEntries)
      .values({
        sourceId: data.sourceId,
        cweId: data.cweId,
        title: data.title,
        content: data.content,
        severity: data.severity,
        remediation: data.remediation,
        tags: data.tags ?? [],
        muted: data.muted ?? false,
      })
      .returning();
    return entry;
  },

  /**
   * Update a knowledge entry by ID.
   */
  async updateEntry(entryId: string, data: {
    cweId?: string;
    title?: string;
    content?: string;
    severity?: string;
    remediation?: string;
    tags?: string[];
    muted?: boolean;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(knowledgeEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeEntries.id, entryId))
      .returning();
    return updated ?? null;
  },

  /**
   * Soft-mute a knowledge entry.
   */
  async muteEntry(entryId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [updated] = await executor
      .update(knowledgeEntries)
      .set({ muted: true, updatedAt: new Date() })
      .where(eq(knowledgeEntries.id, entryId))
      .returning();
    return updated ?? null;
  },

  /**
   * Delete a knowledge entry by ID.
   */
  async deleteEntry(entryId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [deleted] = await executor
      .delete(knowledgeEntries)
      .where(eq(knowledgeEntries.id, entryId))
      .returning();
    return deleted ?? null;
  },

  /**
   * Count entries for a given source.
   */
  async countEntriesBySource(sourceId: string, tx?: Tx): Promise<number> {
    const executor = tx ?? db;
    const [{ total }] = await executor
      .select({ total: count() })
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.sourceId, sourceId));
    return total;
  },

  /**
   * Delete all entries for a given source.
   */
  async deleteEntriesBySource(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.delete(knowledgeEntries).where(eq(knowledgeEntries.sourceId, sourceId));
  },

  /**
   * Find knowledge entries by CWE ID (global — not workspace-scoped).
   * Knowledge base is shared across all workspaces.
   * Used by AI verification to enrich prompts with CWE context.
   *
   * @param cweId - CWE identifier (e.g. "CWE-787")
   * @param tx - Optional transaction context
   * @returns Matching knowledge entries with source info
   */
  async findByCweId(cweId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .select({
        id: knowledgeEntries.id,
        cweId: knowledgeEntries.cweId,
        title: knowledgeEntries.title,
        content: knowledgeEntries.content,
        severity: knowledgeEntries.severity,
        remediation: knowledgeEntries.remediation,
        tags: knowledgeEntries.tags,
        sourceName: knowledgeSources.name,
      })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(eq(knowledgeEntries.cweId, cweId))
      .orderBy(desc(knowledgeEntries.createdAt));
  },

  // ── Knowledge Sources ──────────────────────────────────────────────

  /**
   * List all knowledge sources with live entry counts.
   */
  async listSources(tx?: Tx) {
    const executor = tx ?? db;
    const rows = await executor
      .select({
        id: knowledgeSources.id,
        name: knowledgeSources.name,
        type: knowledgeSources.type,
        status: knowledgeSources.status,
        lastSyncedAt: knowledgeSources.lastSyncedAt,
        createdAt: knowledgeSources.createdAt,
        entryCount: sql<number>`count(${knowledgeEntries.id})`,
      })
      .from(knowledgeSources)
      .leftJoin(knowledgeEntries, eq(knowledgeEntries.sourceId, knowledgeSources.id))
      .groupBy(knowledgeSources.id);
    return rows;
  },

  /**
   * List sources for backward compatibility (calls listSources).
   */
  async listSourcesByWorkspace(_workspaceId: string, tx?: Tx) {
    return this.listSources(tx);
  },

  /**
   * Find a source by ID (global — not workspace-scoped).
   */
  async findSourceById(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, sourceId))
      .limit(1);
    return source ?? null;
  },

  /**
   * Find a source by ID (alias for backward compatibility).
   */
  async findSourceByIdWithWorkspaceScope(sourceId: string, _workspaceId: string, tx?: Tx) {
    return this.findSourceById(sourceId, tx);
  },

  /**
   * Find a source by ID (alias for backward compatibility).
   */
  async findSourceByIdForWorkspace(sourceId: string, _workspaceId: string, tx?: Tx) {
    return this.findSourceById(sourceId, tx);
  },

  /**
   * Insert a knowledge source (global — workspaceId optional).
   */
  async insertSource(data: {
    workspaceId?: string;
    name: string;
    type: string;
    url?: string;
    status?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .insert(knowledgeSources)
      .values({
        workspaceId: data.workspaceId ?? null,
        name: data.name,
        type: data.type,
        url: data.url,
        status: data.status ?? 'disconnected',
      })
      .returning();
    return source;
  },

  /**
   * Update a knowledge source by ID.
   */
  async updateSource(sourceId: string, data: Record<string, unknown>, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .update(knowledgeSources)
      .set(data)
      .where(eq(knowledgeSources.id, sourceId))
      .returning();
    return source ?? null;
  },

  /**
   * Update source status by ID.
   */
  async updateSourceStatus(sourceId: string, status: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .update(knowledgeSources)
      .set({ status })
      .where(eq(knowledgeSources.id, sourceId));
  },

  /**
   * Update source entryCount by ID.
   */
  async updateSourceEntryCount(sourceId: string, entryCount: number, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .update(knowledgeSources)
      .set({ entryCount: entryCount })
      .where(eq(knowledgeSources.id, sourceId));
  },

  /**
   * Delete a source by ID.
   */
  async deleteSource(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.delete(knowledgeSources).where(eq(knowledgeSources.id, sourceId));
  },

  /**
   * Delete a source and all its entries in a transaction.
   */
  async deleteSourceWithEntries(sourceId: string) {
    return db.transaction(async (tx) => {
      await tx.delete(knowledgeEntries).where(eq(knowledgeEntries.sourceId, sourceId));
      await tx.delete(knowledgeSources).where(eq(knowledgeSources.id, sourceId));
    });
  },

  // ── Knowledge Backfill Jobs ────────────────────────────────────────

  /**
   * List backfill jobs for a source, ordered by createdAt desc.
   */
  async listBackfillJobs(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(eq(knowledgeBackfillJobs.sourceId, sourceId))
      .orderBy(desc(knowledgeBackfillJobs.createdAt));
  },

  /**
   * Get the latest active (queued or running) backfill job for a source.
   */
  async findActiveBackfillJob(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [job] = await executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(
        and(
          eq(knowledgeBackfillJobs.sourceId, sourceId),
          inArray(knowledgeBackfillJobs.status, ['queued', 'running']),
        ),
      )
      .orderBy(desc(knowledgeBackfillJobs.createdAt))
      .limit(1);
    return job ?? null;
  },

  /**
   * Get a backfill job by ID.
   */
  async findBackfillJobById(jobId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [job] = await executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(eq(knowledgeBackfillJobs.id, jobId))
      .limit(1);
    return job ?? null;
  },

  /**
   * Get the latest failed backfill job for a source.
   */
  async findLatestFailedBackfillJob(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [job] = await executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(
        and(
          eq(knowledgeBackfillJobs.sourceId, sourceId),
          eq(knowledgeBackfillJobs.status, 'failed'),
        ),
      )
      .orderBy(desc(knowledgeBackfillJobs.createdAt))
      .limit(1);
    return job ?? null;
  },

  /**
   * Insert a backfill job.
   */
  async insertBackfillJob(data: {
    sourceId: string;
    sourceType: string;
    status: string;
    rangeStart: Date;
    rangeEnd: Date;
    cursorStart: Date;
    windowDays: number;
    maxDurationMs: number;
    maxRetries: number;
    importedCount: number;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [job] = await executor
      .insert(knowledgeBackfillJobs)
      .values(data)
      .returning();
    return job;
  },

  /**
   * Update a backfill job by ID.
   */
  async updateBackfillJob(jobId: string, data: {
    status?: string;
    lastError?: string | null;
    cursorStart?: Date;
    importedCount?: number;
    retryCount?: number;
    startedAt?: Date;
    completedAt?: Date;
    updatedAt?: Date;
  }, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .update(knowledgeBackfillJobs)
      .set({ ...data, updatedAt: data.updatedAt ?? new Date() })
      .where(eq(knowledgeBackfillJobs.id, jobId));
  },

  /**
   * List queued/running backfill jobs for a source (for stale job detection).
   */
  async listActiveBackfillJobs(sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(
        eq(knowledgeBackfillJobs.sourceId, sourceId),
        inArray(knowledgeBackfillJobs.status, ['queued', 'running']),
      ))
      .orderBy(desc(knowledgeBackfillJobs.createdAt));
  },

  /**
   * Count entries for a source using raw SQL (for backfill progress).
   */
  async countEntriesBySourceRaw(sourceId: string, tx?: Tx): Promise<number> {
    const executor = tx ?? db;
    const [{ total }] = await executor
      .select({ total: sql<number>`count(*)::int` })
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.sourceId, sourceId));
    return total;
  },
};
