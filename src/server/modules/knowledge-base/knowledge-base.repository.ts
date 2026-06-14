import { and, eq, count, or, ilike, sql, isNull, desc, inArray } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources, knowledgeBackfillJobs } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
   * Count entries matching conditions with workspace + global source join.
   */
  async countEntriesByWorkspace(
    workspaceId: string,
    params: { search?: string; source?: string },
    tx?: Tx,
  ): Promise<number> {
    const executor = tx ?? db;
    const conditions = [
      or(
        eq(knowledgeSources.workspaceId, workspaceId),
        isNull(knowledgeSources.workspaceId),
      )!,
    ];

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

    const where = and(...conditions);
    const [{ total }] = await executor
      .select({ total: count() })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(where);

    return total;
  },

  /**
   * List entries with workspace + global source join, ordered by title.
   */
  async listEntriesByWorkspace(
    workspaceId: string,
    params: { search?: string; source?: string; limit: number; offset: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const conditions = [
      or(
        eq(knowledgeSources.workspaceId, workspaceId),
        isNull(knowledgeSources.workspaceId),
      )!,
    ];

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

    const where = and(...conditions);

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
   * Get a single entry by ID, scoped to workspace (workspace-owned or global sources).
   */
  async findEntryByIdWithWorkspaceScope(entryId: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [entry] = await executor
      .select(entrySelectFields)
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(and(
        or(
          eq(knowledgeSources.workspaceId, workspaceId),
          isNull(knowledgeSources.workspaceId),
        )!,
        eq(knowledgeEntries.id, entryId),
      ))
      .limit(1);
    return entry ?? null;
  },

  /**
   * Get entry ID and sourceId, verifying the entry's source belongs to the workspace.
   */
  async findEntryForWorkspace(entryId: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [row] = await executor
      .select({ id: knowledgeEntries.id, sourceId: knowledgeEntries.sourceId })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.sourceId))
      .where(and(eq(knowledgeEntries.id, entryId), eq(knowledgeSources.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
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

  // ── Knowledge Sources ──────────────────────────────────────────────

  /**
   * List sources for a workspace (workspace-owned + global).
   */
  async listSourcesByWorkspace(workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(knowledgeSources).where(
      or(
        eq(knowledgeSources.workspaceId, workspaceId),
        isNull(knowledgeSources.workspaceId),
      ),
    );
  },

  /**
   * Find a source by ID, scoped to workspace (workspace-owned + global).
   */
  async findSourceByIdWithWorkspaceScope(sourceId: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .select()
      .from(knowledgeSources)
      .where(and(
        eq(knowledgeSources.id, sourceId),
        or(
          eq(knowledgeSources.workspaceId, workspaceId),
          isNull(knowledgeSources.workspaceId),
        ),
      ))
      .limit(1);
    return source ?? null;
  },

  /**
   * Find a source by ID, scoped to a specific workspace (workspace-owned only).
   */
  async findSourceByIdForWorkspace(sourceId: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.workspaceId, workspaceId)))
      .limit(1);
    return source ?? null;
  },

  /**
   * Insert a knowledge source.
   */
  async insertSource(data: {
    workspaceId: string;
    name: string;
    type: string;
    url?: string;
    status?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [source] = await executor
      .insert(knowledgeSources)
      .values({
        workspaceId: data.workspaceId,
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
   * List backfill jobs for a workspace + source, ordered by createdAt desc.
   */
  async listBackfillJobs(workspaceId: string, sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(
        eq(knowledgeBackfillJobs.workspaceId, workspaceId),
        eq(knowledgeBackfillJobs.sourceId, sourceId),
      ))
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
    workspaceId: string;
    sourceId: string;
    sourceType: string;
    status: string;
    rangeStart: Date;
    rangeEnd: Date;
    cursorStart: Date;
    windowDays: number;
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
   * List queued/running backfill jobs for a workspace + source (for stale job detection).
   */
  async listActiveBackfillJobs(workspaceId: string, sourceId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor
      .select()
      .from(knowledgeBackfillJobs)
      .where(and(
        eq(knowledgeBackfillJobs.workspaceId, workspaceId),
        eq(knowledgeBackfillJobs.sourceId, sourceId),
        inArray(knowledgeBackfillJobs.status, ['queued', 'running']),
      ));
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
