import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';
import { knowledgeBaseRepository } from './knowledge-base.repository';
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
    const result = await knowledgeBaseRepository.listSourcesByWorkspace(workspaceId);
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
    const source = await knowledgeBaseRepository.findSourceByIdWithWorkspaceScope(sourceId, workspaceId);
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
    await assertWorkspaceMember(workspaceId, userId);
    const data = createKnowledgeSourceSchema.parse(input);
    const source = await knowledgeBaseRepository.insertSource({
      workspaceId: workspaceId,
      name: data.name,
      type: data.type,
      url: data.url,
    });
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
    await assertWorkspaceMember(workspaceId, userId);
    await this.getSourceById(sourceId, workspaceId);
    const data = updateKnowledgeSourceSchema.parse(input);
    const source = await knowledgeBaseRepository.updateSource(sourceId, data);
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
    await assertWorkspaceMember(workspaceId, userId);
    await this.getSourceById(sourceId, workspaceId);
    await knowledgeBaseRepository.deleteSourceWithEntries(sourceId);
    logger.knowledge.info('deleteSource completed', { sourceId });
  },

  /**
   * Runs a source sync immediately.
   * Sets status to 'syncing' during sync, reverts to 'error' on failure.
   *
   * @throws {AppError} When the source is missing or sync fails.
   */
  async triggerSync(sourceId: string, workspaceId: string) {
    logger.knowledge.info('triggerSync', { sourceId, workspaceId });
    await this.getSourceById(sourceId, workspaceId);
    await knowledgeBaseRepository.updateSourceStatus(sourceId, 'syncing');
    try {
      const result = await syncEngine.syncSource(sourceId);
      logger.knowledge.info('triggerSync completed', { sourceId, created: result.entriesCreated, updated: result.entriesUpdated });
      return { message: `Synced ${result.entriesCreated + result.entriesUpdated} knowledge entries`, result };
    } catch (e) {
      await knowledgeBaseRepository.updateSourceStatus(sourceId, 'error');
      logger.knowledge.error('triggerSync failed', { sourceId, error: e instanceof Error ? e.message : e });
      throw e;
    }
  },
};
