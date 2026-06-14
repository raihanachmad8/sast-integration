import { dashboardRepository } from './dashboard.repository';
import { logger } from '@/server/lib/logger';

export const dashboardService = {
  async getStats(workspaceId: string) {
    logger.dashboard.info('getStats', { workspaceId });
    const result = await dashboardRepository.getStats(workspaceId);
    logger.dashboard.info('getStats completed', { totalFindings: result.totalFindings });
    return result;
  },

  async getRecentScans(workspaceId: string, limit?: number) {
    logger.dashboard.info('getRecentScans', { workspaceId });
    const result = await dashboardRepository.getRecentScans(workspaceId, limit);
    logger.dashboard.info('getRecentScans completed', { count: result.length });
    return result;
  },

  async getFindingsSummary(workspaceId: string) {
    logger.dashboard.info('getFindingsSummary', { workspaceId });
    const result = await dashboardRepository.getFindingsSummary(workspaceId);
    logger.dashboard.info('getFindingsSummary completed', { count: result.length });
    return result;
  },

  async getHealthStatus(workspaceId: string) {
    logger.dashboard.info('getHealthStatus', { workspaceId });
    const result = await dashboardRepository.getHealthStatus(workspaceId);
    logger.dashboard.info('getHealthStatus completed', { scanners: result.scanners, sources: result.sources, models: result.models });
    return result;
  },
};
