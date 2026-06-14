import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { knowledgeBaseRepository } from './knowledge-base.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import { createKnowledgeEntrySchema, updateKnowledgeEntrySchema } from '@/commons/schemas/knowledge-base.schema';

export interface ListEntriesParams {
  search?: string;
  source?: string;
  page?: number;
  perPage?: number;
}

export const knowledgeBaseService = {
  /**
   * Lists knowledge entries belonging to a workspace with server-side search and filter.
   *
   * @param workspaceId - The workspace ID.
   * @param params - Optional search, source filter, and pagination params.
   */
  async listByWorkspace(workspaceId: string, params: ListEntriesParams = {}) {
    logger.knowledge.info('listByWorkspace', { workspaceId, search: params.search, source: params.source });
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 25;
    const offset = (page - 1) * perPage;

    const [total, data] = await Promise.all([
      knowledgeBaseRepository.countEntriesByWorkspace(workspaceId, { search: params.search, source: params.source }),
      knowledgeBaseRepository.listEntriesByWorkspace(workspaceId, { search: params.search, source: params.source, limit: perPage, offset }),
    ]);

    logger.knowledge.info('listByWorkspace completed', { count: data.length, total });
    return { data, total, page, perPage };
  },

  /**
   * Returns a single entry after verifying its source belongs to the workspace.
   *
   * @throws {AppError} When the entry is not found in the workspace.
   */
  async getById(workspaceId: string, entryId: string) {
    logger.knowledge.info('getById', { workspaceId, entryId });
    const entry = await knowledgeBaseRepository.findEntryByIdWithWorkspaceScope(entryId, workspaceId);
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
    const source = await knowledgeBaseRepository.findSourceByIdForWorkspace(data.sourceId, workspaceId);

    if (!source) throw new AppError('Knowledge source not found in this workspace', 404, 'NOT_FOUND');

    const entry = await knowledgeBaseRepository.insertEntry({
      sourceId: data.sourceId,
      cweId: data.cweId,
      title: data.title,
      content: data.content,
      severity: data.severity,
      remediation: data.remediation,
      tags: data.tags,
      muted: data.muted,
    });

    const total = await knowledgeBaseRepository.countEntriesBySource(source.id);
    await knowledgeBaseRepository.updateSourceEntryCount(source.id, total);

    logger.knowledge.info('createEntry completed', { entryId: entry.id });
    return entry;
  },

  /**
   * Updates a knowledge entry. Verifies the entry's source belongs to the workspace.
   *
   * @throws {AppError} When the entry does not exist or belongs to a different workspace.
   */
  async updateEntry(entryId: string, input: unknown, workspaceId: string, userId: string) {
    logger.knowledge.info('updateEntry', { entryId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    // IDOR fix: verify entry's source belongs to this workspace
    const existing = await knowledgeBaseRepository.findEntryForWorkspace(entryId, workspaceId);
    if (!existing) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    const data = updateKnowledgeEntrySchema.parse(input);
    const updated = await knowledgeBaseRepository.updateEntry(entryId, {
      cweId: data.cweId,
      title: data.title,
      content: data.content,
      severity: data.severity,
      remediation: data.remediation,
      tags: data.tags,
      muted: data.muted,
    });

    if (!updated) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    logger.knowledge.info('updateEntry completed', { entryId });
    return updated;
  },

  /**
   * Deletes a knowledge entry and refreshes its source count.
   * Verifies the entry's source belongs to the workspace.
   *
   * @throws {AppError} When the entry does not exist or belongs to a different workspace.
   */
  async deleteEntry(entryId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('deleteEntry', { entryId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    // IDOR fix: verify entry's source belongs to this workspace
    const existing = await knowledgeBaseRepository.findEntryForWorkspace(entryId, workspaceId);
    if (!existing) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    const deleted = await knowledgeBaseRepository.deleteEntry(entryId);
    if (!deleted) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    const total = await knowledgeBaseRepository.countEntriesBySource(deleted.sourceId);
    await knowledgeBaseRepository.updateSourceEntryCount(deleted.sourceId, total);

    logger.knowledge.info('deleteEntry completed', { entryId });
    return deleted;
  },

  /**
   * Mutes (soft-disables) a knowledge entry.
   */
  async muteEntry(entryId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('muteEntry', { entryId });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await knowledgeBaseRepository.findEntryForWorkspace(entryId, workspaceId);
    if (!existing) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    const updated = await knowledgeBaseRepository.muteEntry(entryId);
    if (!updated) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    logger.knowledge.info('muteEntry completed', { entryId });
    return updated;
  },
};
