import { logger } from '@/server/lib/logger';
import { scanRepository } from './scan.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { AppError } from '@/server/http/errors';

export const scanService = {
  async list(workspaceId: string, params: { page: number; per_page: number }) {
    logger.scan.info('list', { workspaceId, page: params.page });
    return scanRepository.listByWorkspace(workspaceId, params);
  },

  async getById(id: string, workspaceId: string) {
    logger.scan.info('getById', { id, workspaceId });
    const scan = await scanRepository.getById(id);
    if (!scan) throw new AppError('Scan not found', 404, 'NOT_FOUND');
    return scan;
  },

  async getScanResults(scanId: string, _workspaceId: string) {
    logger.scan.info('getScanResults', { scanId });
    const scan = await scanRepository.getById(scanId);
    if (!scan) throw new AppError('Scan not found', 404, 'NOT_FOUND');
    return scanRepository.getScanResults(scanId);
  },

  async create(data: { repository_id: string; branch: string; origin: string }, workspaceId: string, userId: string) {
    logger.scan.info('create', { workspaceId, repositoryId: data.repository_id });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError('Not a workspace member', 403, 'FORBIDDEN');
    return scanRepository.create({ ...data, status: 'pending', created_by: userId });
  },

  async updateStatus(id: string, status: string, workspaceId: string, userId: string) {
    logger.scan.info('updateStatus', { id, status });
    const role = await workspaceRepository.getMemberRole(workspaceId, userId);
    if (!role) throw new AppError('Not a workspace member', 403, 'FORBIDDEN');
    return scanRepository.updateStatus(id, status);
  },
};
