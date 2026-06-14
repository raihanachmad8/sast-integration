import { auditRepository } from './audit.repository';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export const auditService = {
  async listLogs(workspaceId: string, params: { page?: number; limit?: number }) {
    logger.audit.info('listLogs', { workspaceId });
    try {
      const result = await auditRepository.listLogs(workspaceId, params);
      logger.audit.info('listLogs completed', { count: result.data.length });
      return result;
    } catch (error) {
      logger.audit.error('listLogs failed', { workspaceId, error });
      throw new AppError('Failed to fetch audit logs', 500, 'INTERNAL_ERROR');
    }
  },

  async listActivityLogs(workspaceId: string, params: { page?: number; limit?: number }) {
    logger.audit.info('listActivityLogs', { workspaceId });
    try {
      const result = await auditRepository.listActivityLogs(workspaceId, params);
      logger.audit.info('listActivityLogs completed', { count: result.data.length });
      return result;
    } catch (error) {
      logger.audit.error('listActivityLogs failed', { workspaceId, error });
      throw new AppError('Failed to fetch activity logs', 500, 'INTERNAL_ERROR');
    }
  },
};
