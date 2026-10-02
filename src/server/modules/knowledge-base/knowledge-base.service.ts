import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { AppError } from '@/server/http/errors';
import {
  createKnowledgeEntrySchema,
  updateKnowledgeEntrySchema,
  type CreateKnowledgeEntryInput,
  type UpdateKnowledgeEntryInput,
} from '@/commons/schemas/knowledge-base';

type KnowledgeEntryRow = typeof knowledgeEntries.$inferSelect;

export interface KnowledgeEntryWithSource extends KnowledgeEntryRow {
  source_name?: string;
}

export const knowledgeBaseService = {
  async createEntry(workspaceId: string, input: unknown): Promise<KnowledgeEntryRow> {
    const data = createKnowledgeEntrySchema.parse(input);

    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.id, data.sourceId),
          eq(knowledgeSources.workspace_id, workspaceId),
        ),
      )
      .limit(1);

    if (!source) {
      throw new AppError('Knowledge source not found in this workspace', 404, 'NOT_FOUND');
    }

    const [entry] = await db
      .insert(knowledgeEntries)
      .values({
        source_id: data.sourceId,
        cwe_id: data.cweId,
        title: data.title,
        content: data.content,
        severity: data.severity,
        remediation: data.remediation,
        tags: data.tags,
        muted: data.muted ?? false,
        references: data.references,
      })
      .returning();

    await db
      .update(knowledgeSources)
      .set({ entry_count: (source.entry_count ?? 0) + 1 })
      .where(eq(knowledgeSources.id, data.sourceId));

    return entry;
  },

  async listByWorkspace(workspaceId: string): Promise<KnowledgeEntryWithSource[]> {
    return db
      .select({
        id: knowledgeEntries.id,
        source_id: knowledgeEntries.source_id,
        cwe_id: knowledgeEntries.cwe_id,
        title: knowledgeEntries.title,
        content: knowledgeEntries.content,
        severity: knowledgeEntries.severity,
        remediation: knowledgeEntries.remediation,
        tags: knowledgeEntries.tags,
        muted: knowledgeEntries.muted,
        used_by_ai_count: knowledgeEntries.used_by_ai_count,
        references: knowledgeEntries.references,
        created_at: knowledgeEntries.created_at,
        updated_at: knowledgeEntries.updated_at,
        source_name: knowledgeSources.name,
      })
      .from(knowledgeEntries)
      .innerJoin(
        knowledgeSources,
        eq(knowledgeEntries.source_id, knowledgeSources.id),
      )
      .where(eq(knowledgeSources.workspace_id, workspaceId));
  },

  async getEntryById(entryId: string): Promise<KnowledgeEntryRow | null> {
    const [entry] = await db
      .select()
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.id, entryId))
      .limit(1);

    return entry ?? null;
  },

  async getSourceForEntry(entryId: string) {
    const [row] = await db
      .select({ source_id: knowledgeEntries.source_id })
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.id, entryId))
      .limit(1);

    if (!row) return null;

    if (!row.source_id) return null;

    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(eq(knowledgeSources.id, row.source_id))
      .limit(1);

    return source ?? null;
  },

  async updateEntry(
    entryId: string,
    input: unknown,
  ): Promise<KnowledgeEntryRow> {
    const data = updateKnowledgeEntrySchema.parse(input);

    const existing = await this.getEntryById(entryId);
    if (!existing) {
      throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    }

    const [updated] = await db
      .update(knowledgeEntries)
      .set({
        ...(data.cweId !== undefined && { cwe_id: data.cweId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.remediation !== undefined && { remediation: data.remediation }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.muted !== undefined && { muted: data.muted }),
        ...(data.references !== undefined && { references: data.references }),
        updated_at: new Date(),
      })
      .where(eq(knowledgeEntries.id, entryId))
      .returning();

    return updated;
  },

  async deleteEntry(entryId: string): Promise<void> {
    const existing = await this.getEntryById(entryId);
    if (!existing) {
      throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    }

    await db
      .delete(knowledgeEntries)
      .where(eq(knowledgeEntries.id, entryId));

    if (existing.source_id) {
      const [source] = await db
        .select()
        .from(knowledgeSources)
        .where(eq(knowledgeSources.id, existing.source_id))
        .limit(1);

      if (source && (source.entry_count ?? 0) > 0) {
        await db
          .update(knowledgeSources)
          .set({ entry_count: source.entry_count! - 1 })
          .where(eq(knowledgeSources.id, existing.source_id));
      }
    }
  },
};
