import { createKnowledgeSourceSchema, updateKnowledgeSourceSchema } from '@/commons/schemas/knowledge-base.schema';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';

import { knowledgeBaseRepository } from './knowledge-base.repository';

export const knowledgeSourceService = {
  /**
   * Lists knowledge sources for a workspace.
   */
  async list(workspaceId: string) {
    logger.knowledge.info('list', { workspaceId });
    const result = await knowledgeBaseRepository.listSourcesByWorkspace(workspaceId);
    logger.knowledge.info('list completed', { count: result.length });
    return result;
  },

  /**
   * Returns one workspace-owned source.
   */
  async getById(workspaceId: string, sourceId: string) {
    logger.knowledge.info('getById', { sourceId, workspaceId });
    const source = await knowledgeBaseRepository.findSourceByIdWithWorkspaceScope(sourceId, workspaceId);
    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    logger.knowledge.info('getById completed', { sourceId });
    return source;
  },

  /**
   * Creates a new source in a workspace.
   */
  async create(workspaceId: string, input: unknown, userId: string) {
    logger.knowledge.info('create', { workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const data = createKnowledgeSourceSchema.parse(input);
    const source = await knowledgeBaseRepository.insertSource({
      workspaceId: workspaceId,
      name: data.name,
      type: data.type,
      url: data.url,
    });
    logger.knowledge.info('create completed', { sourceId: source.id });
    return source;
  },

  /**
   * Updates a workspace source.
   */
  async update(workspaceId: string, sourceId: string, input: unknown, userId: string) {
    logger.knowledge.info('update', { sourceId, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    await this.getById(workspaceId, sourceId);
    const data = updateKnowledgeSourceSchema.parse(input);
    const source = await knowledgeBaseRepository.updateSource(sourceId, data);
    logger.knowledge.info('update completed', { sourceId });
    return source;
  },

  /**
   * Deletes a workspace source and its entries.
   */
  async delete(workspaceId: string, sourceId: string, userId: string) {
    logger.knowledge.info('delete', { sourceId, workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    await this.getById(workspaceId, sourceId);
    await knowledgeBaseRepository.deleteSourceWithEntries(sourceId);
    logger.knowledge.info('delete completed', { sourceId });
  },
};
