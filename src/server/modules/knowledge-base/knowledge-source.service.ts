import { knowledgeSourceRepository } from './knowledge-source.repository';
import { syncEngine } from './sync-engine';
import {
  createKnowledgeSourceSchema,
  updateKnowledgeSourceSchema,
} from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

/**
 * Service responsible for managing Knowledge Sources.
 *
 * Knowledge Sources represent external intelligence feeds (CWE, NVD, MITRE)
 * or custom rule sets that provide context for AI verification.
 */
export const knowledgeSourceService = {
  /**
   * Creates a new knowledge source in a workspace.
   */
  async createSource(workspaceId: string, input: unknown) {
    const data = createKnowledgeSourceSchema.parse(input);

    const source = await knowledgeSourceRepository.create({
      workspaceId,
      name: data.name,
      type: data.type,
      url: data.url ?? null,
    });

    return source;
  },

  /**
   * Retrieves a single knowledge source by ID within a workspace.
   */
  async getSourceById(id: string, workspaceId: string) {
    const source = await knowledgeSourceRepository.findById(id, workspaceId);
    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }
    return source;
  },

  /**
   * Lists all knowledge sources belonging to a workspace.
   */
  async listSourcesByWorkspace(workspaceId: string) {
    return knowledgeSourceRepository.findByWorkspace(workspaceId);
  },

  /**
   * Updates an existing knowledge source.
   */
  async updateSource(id: string, workspaceId: string, input: unknown) {
    const data = updateKnowledgeSourceSchema.parse(input);

    const updated = await knowledgeSourceRepository.update(id, workspaceId, data);
    if (!updated) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }
    return updated;
  },

  /**
   * Deletes a knowledge source from a workspace.
   * Does NOT delete associated entries — they become orphaned.
   */
  async deleteSource(id: string, workspaceId: string) {
    const source = await knowledgeSourceRepository.findById(id, workspaceId);
    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }

    await knowledgeSourceRepository.delete(id, workspaceId);
  },

  /**
   * Triggers a sync for a knowledge source.
   * Calls the sync engine to fetch data from the provider (CWE/NVD).
   */
  async triggerSync(id: string, workspaceId: string) {
    const source = await knowledgeSourceRepository.findById(id, workspaceId);
    if (!source) {
      throw new AppError('Knowledge source not found', 404, 'NOT_FOUND');
    }

    if (source.status === 'syncing') {
      throw new AppError('Sync already in progress', 409, 'CONFLICT');
    }

    const result = await syncEngine.syncSource(id);

    return {
      message: `Sync completed: ${result.entriesCreated} created, ${result.entriesUpdated} updated${result.errors.length > 0 ? ` (${result.errors.length} errors, used fallback)` : ''}`,
    };
  },
};
