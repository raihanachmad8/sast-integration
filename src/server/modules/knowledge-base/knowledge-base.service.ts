import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';
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
   * Lists all knowledge entries (global — not workspace-scoped).
   *
   * @param params - Optional search, source filter, and pagination params.
   */
  async list(params: ListEntriesParams = {}) {
    logger.knowledge.info('list', { search: params.search, source: params.source });
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 25;
    const offset = (page - 1) * perPage;

    const [total, data] = await Promise.all([
      knowledgeBaseRepository.countEntries({ search: params.search, source: params.source }),
      knowledgeBaseRepository.listEntries({ search: params.search, source: params.source, limit: perPage, offset }),
    ]);

    logger.knowledge.info('list completed', { count: data.length, total });
    return { data, total, page, perPage };
  },

  /**
   * Lists knowledge entries (backward compatibility alias).
   */
  async listByWorkspace(_workspaceId: string, params: ListEntriesParams = {}) {
    return this.list(params);
  },

  /**
   * Returns a single entry by ID (global — not workspace-scoped).
   *
   * @throws {AppError} When the entry is not found.
   */
  async getById(_workspaceId: string, entryId: string) {
    logger.knowledge.info('getById', { entryId });
    const entry = await knowledgeBaseRepository.findEntryById(entryId);
    if (!entry) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');
    logger.knowledge.info('getById completed', { entryId });
    return entry;
  },

  /**
   * Creates a custom or source-owned knowledge entry.
   * Requires workspace membership for write access.
   *
   * @throws {AppError} When the source does not exist.
   */
  async createEntry(workspaceId: string, input: unknown, userId: string) {
    logger.knowledge.info('createEntry', { workspaceId });
    await assertWorkspaceMember(workspaceId, userId);
    const data = createKnowledgeEntrySchema.parse(input);
    const source = await knowledgeBaseRepository.findSourceById(data.sourceId);

    if (!source) throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');

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
   * Updates a knowledge entry (global — not workspace-scoped).
   * Requires workspace membership for write access.
   *
   * @throws {AppError} When the entry does not exist.
   */
  async updateEntry(entryId: string, input: unknown, workspaceId: string, userId: string) {
    logger.knowledge.info('updateEntry', { entryId });
    await assertWorkspaceMember(workspaceId, userId);

    const existing = await knowledgeBaseRepository.findEntryById(entryId);
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
   * Requires workspace membership for write access.
   *
   * @throws {AppError} When the entry does not exist.
   */
  async deleteEntry(entryId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('deleteEntry', { entryId });
    await assertWorkspaceMember(workspaceId, userId);

    const existing = await knowledgeBaseRepository.findEntryById(entryId);
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
   * Requires workspace membership for write access.
   */
  async muteEntry(entryId: string, workspaceId: string, userId: string) {
    logger.knowledge.info('muteEntry', { entryId });
    await assertWorkspaceMember(workspaceId, userId);

    const existing = await knowledgeBaseRepository.findEntryById(entryId);
    if (!existing) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    const updated = await knowledgeBaseRepository.muteEntry(entryId);
    if (!updated) throw new AppError('Knowledge entry not found', 404, 'NOT_FOUND');

    logger.knowledge.info('muteEntry completed', { entryId });
    return updated;
  },
};
