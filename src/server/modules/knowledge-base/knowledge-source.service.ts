import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { knowledgeEntries, knowledgeSources } from '@drizzle/schema/integrations';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { createKnowledgeSourceSchema, updateKnowledgeSourceSchema } from '@/commons/schemas/knowledge-base.schema';
import { syncEngine } from './sync-engine';

export const knowledgeSourceService = {
  /**
   * Lists knowledge sources for a workspace.
   *
   * @throws {AppError} When the query fails unexpectedly.
   */
  async listSourcesByWorkspace(workspaceId: string) {
    logger.knowledge.info('listSourcesByWorkspace', { workspaceId });
    const result = await db.select().from(knowledgeSources).where(eq(knowledgeSources.workspace_id, workspaceId));
    logger.knowledge.info('listSourcesByWorkspace completed', { count: result.length });
    return result;
  },

  /**
   * Returns one workspace-owned source.
   *
   * @throws {AppError} When the source is missing.
   */
  async getSourceById(sourceId: string, workspaceId: string) {
    logger.knowledge.info('getSourceById', { sourceId, workspaceId });
    const [source] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.id, sourceId), eq(knowledgeSources.workspace_id, workspaceId)))
      .limit(1);
    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    logger.knowledge.info('getSourceById completed', { sourceId });
    return source;
  },

  /**
   * Creates a new source in a workspace.
   *
   * @throws {AppError} When validation fails.
   */
  async createSource(workspaceId: string, input: unknown, userId: string) {
    logger.knowledge.info('createSource', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = createKnowledgeSourceSchema.parse(input);
    const [source] = await db.insert(knowledgeSources).values({
      workspace_id: workspaceId,
      name: data.name,
      type: data.type,
      url: data.url,
      status: 'disconnected',
    }).returning();
    logger.knowledge.info('createSource completed', { sourceId: source.id });
    return source;
  },

  /**
   * Updates a workspace source.
   *
   * @throws {AppError} When the source is missing.
   */
  async updateSource(sourceId: string, workspaceId: string, input: unknown, userId: string) {
    logger.knowledge.info('updateSource', { sourceId, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    await this.getSourceById(sourceId, workspaceId);
    const data = updateKnowledgeSourceSchema.parse(input);
    const [source] = await db.update(knowledgeSources).set(data).where(eq(knowledgeSources.id, sourceId)).returning();
    logger.knowledge.info('updateSource completed', { sourceId });
    return source;
  },

  /**
   * Deletes a workspace source and its entries.
   *
   * @throws {AppError} When the source is missing.
   */
  async deleteSource(sourceId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('deleteSource', { sourceId, workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    await this.getSourceById(sourceId, workspaceId);
    await db.transaction(async (tx) => {
      await tx.delete(knowledgeEntries).where(eq(knowledgeEntries.source_id, sourceId));
      await tx.delete(knowledgeSources).where(eq(knowledgeSources.id, sourceId));
    });
    logger.knowledge.info('deleteSource completed', { sourceId });
  },

  /**
   * Runs a source sync immediately.
   *
   * @throws {AppError} When the source is missing or sync fails.
   */
  async triggerSync(sourceId: string, workspaceId: string) {
    logger.knowledge.info('triggerSync', { sourceId, workspaceId });
    await this.getSourceById(sourceId, workspaceId);
    await db.update(knowledgeSources).set({ status: 'syncing' }).where(eq(knowledgeSources.id, sourceId));
    const result = await syncEngine.syncSource(sourceId);
    logger.knowledge.info('triggerSync completed', { sourceId, created: result.entriesCreated, updated: result.entriesUpdated });
    return { message: `Synced ${result.entriesCreated + result.entriesUpdated} knowledge entries`, result };
  },
};
