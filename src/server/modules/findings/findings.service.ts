import { findingsRepository } from './findings.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

interface ListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  projectId?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

interface BulkUpdatePayload {
  status?: string;
  assignedTo?: string | null;
}

export const findingsService = {
  async list(workspaceId: string, params: ListParams) {
    logger.finding.info('list', { workspaceId });
    const result = await findingsRepository.listByWorkspace(workspaceId, params);
    logger.finding.info('list completed', { total: result.total });
    return result;
  },

  async getById(id: string, workspaceId: string) {
    logger.finding.info('getById', { id, workspaceId });
    const result = await findingsRepository.getById(id, workspaceId);
    if (!result) {
      throw new AppError('Finding not found', 404, 'NOT_FOUND');
    }
    logger.finding.info('getById completed', { id });
    return result;
  },

  async updateStatus(
    id: string,
    status: string,
    workspaceId: string,
    userId: string,
  ) {
    logger.finding.info('updateStatus', { id, status, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await findingsRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Finding not found', 404, 'NOT_FOUND');
    }

    const updated = await findingsRepository.updateStatus(id, status);
    logger.finding.info('updateStatus completed', { id, status });
    return updated;
  },

  async assign(
    id: string,
    assigneeId: string | null,
    workspaceId: string,
    userId: string,
  ) {
    logger.finding.info('assign', { id, assigneeId, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const existing = await findingsRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Finding not found', 404, 'NOT_FOUND');
    }

    const updated = await findingsRepository.assign(id, assigneeId);
    logger.finding.info('assign completed', { id, assigneeId });
    return updated;
  },

  async bulkUpdate(
    ids: string[],
    payload: BulkUpdatePayload,
    workspaceId: string,
    userId: string,
  ) {
    logger.finding.info('bulkUpdate', { count: ids.length, workspaceId });

    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    const updated = await findingsRepository.bulkUpdate(ids, payload);
    logger.finding.info('bulkUpdate completed', { count: updated.length });
    return updated;
  },
};
