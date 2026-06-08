import { and, eq, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { createKnowledgeEntrySchema, updateKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base.schema';

export const knowledgeBaseService = {
  /**
   * Lists all knowledge entries belonging to a workspace.
   *
   * @throws {AppError} When the database query fails unexpectedly.
   */
  async listByWorkspace(workspaceId: string) {
    logger.knowledge.info('listByWorkspace', { workspaceId });
    const result = await db
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
        source_type: knowledgeSources.type,
      })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.source_id))
      .where(eq(knowledgeSources.workspace_id, workspaceId));
    logger.knowledge.info('listByWorkspace completed', { count: result.length });
    return result;
  },

  /**
   * Returns a single entry after verifying its source belongs to the workspace.
   *
   * @throws {AppError} When the entry is not found in the workspace.
   */
  async getById(workspaceId: string, entryId: string) {
    logger.knowledge.info('getById', { workspaceId, entryId });
    const [entry] = await db
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
        source_type: knowledgeSources.type,
      })
      .from(knowledgeEntries)
      .innerJoin(knowledgeSources, eq(knowledgeSources.id, knowledgeEntries.source_id))
      .where(and(eq(knowledgeSources.workspace_id, workspaceId), eq(knowledgeEntries.id, entryId)))
      .limit(1);
    if (!entry) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    logger.knowledge.info('getById completed', { entryId });
    return entry;
  },

  /**
   * Creates a custom or source-owned knowledge entry.
   *
   * @throws {AppError} When the source does not belong to the workspace.
   */
  async createEntry(workspaceId: string, input: unknown, userId: string) {
    logger.knowledge.info('createEntry', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = createKnowledgeEntrySchema.parse(input);
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, data.sourceId), eq(knowledgeSources.workspace_id, workspaceId)))
      .limit(1);

    if (!source) throw new AppError('Knowledge source not found in this workspace', 404, 'NOT_FOUND');

    const [entry] = await db
      .insert(knowledgeEntries)
      .values({
        source_id: data.sourceId,
        cwe_id: data.cweId,
        title: data.title,
        content: data.content,
        severity: data.severity,
        remediation: data.remediation,
        tags: data.tags ?? [],
        muted: data.muted ?? false,
      })
      .returning();

    await refreshSourceEntryCount(source.id);
    logger.knowledge.info('createEntry completed', { entryId: entry.id });
    return entry;
  },

  /**
   * Updates a knowledge entry.
   *
   * @throws {AppError} When the entry does not exist.
   */
  async updateEntry(entryId: string, input: unknown, workspaceId: string, userId: string) {
    logger.knowledge.info('updateEntry', { entryId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = updateKnowledgeEntrySchema.parse(input);
    const [updated] = await db
      .update(knowledgeEntries)
      .set({
        cwe_id: data.cweId,
        title: data.title,
        content: data.content,
        severity: data.severity,
        remediation: data.remediation,
        tags: data.tags,
        muted: data.muted,
        updated_at: new Date(),
      })
      .where(eq(knowledgeEntries.id, entryId))
      .returning();

    if (!updated) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    logger.knowledge.info('updateEntry completed', { entryId });
    return updated;
  },

  /**
   * Deletes a knowledge entry and refreshes its source count.
   *
   * @throws {AppError} When the entry does not exist.
   */
  async deleteEntry(entryId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('deleteEntry', { entryId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const [deleted] = await db.delete(knowledgeEntries).where(eq(knowledgeEntries.id, entryId)).returning();
    if (!deleted) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    await refreshSourceEntryCount(deleted.source_id);
    logger.knowledge.info('deleteEntry completed', { entryId });
    return deleted;
  },
};

async function refreshSourceEntryCount(sourceId: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.source_id, sourceId));
  await db.update(knowledgeSources).set({ entry_count: total }).where(eq(knowledgeSources.id, sourceId));
}
