import { dashboardRepository } from './dashboard.repository';
import { logger } from '@/server/lib/logger';

export const dashboardService = {
  /**
   * Retrieve aggregated dashboard statistics for a workspace.
   *
   * @param workspaceId - Workspace UUID to scope results to
   * @returns Dashboard stats including totalFindings, totalScans, and severity breakdown
   */
  async getStats(workspaceId: string) {
    logger.dashboard.info('getStats', { workspaceId });
    const result = await dashboardRepository.getStats(workspaceId);
    logger.dashboard.info('getStats completed', { connectedRepos: result.connectedRepos, criticalFindings: result.criticalFindings });
    return result;
  },

  /**
   * Retrieve recent scans for a workspace, ordered by creation date descending.
   *
   * @param workspaceId - Workspace UUID to scope results to
   * @param limit - Maximum number of scans to return (default 10)
   * @returns Array of recent scan records with repository and project info
   */
  async getRecentScans(workspaceId: string, limit?: number) {
    logger.dashboard.info('getRecentScans', { workspaceId });
    const result = await dashboardRepository.getRecentScans(workspaceId, limit);
    logger.dashboard.info('getRecentScans completed', { count: result.length });
    return result;
  },

  /**
   * Retrieve a summary of findings grouped by severity for a workspace.
   *
   * @param workspaceId - Workspace UUID to scope results to
   * @returns Array of severity summaries with counts
   */
  async getFindingsSummary(workspaceId: string) {
    logger.dashboard.info('getFindingsSummary', { workspaceId });
    const result = await dashboardRepository.getFindingsSummary(workspaceId);
    logger.dashboard.info('getFindingsSummary completed', { count: result.length });
    return result;
  },

  /**
   * Retrieve the health status of scanners, sources, and models for a workspace.
   *
   * @param workspaceId - Workspace UUID to scope results to
   * @returns Health status object with scanner, source, and model counts
   */
  async getHealthStatus(workspaceId: string) {
    logger.dashboard.info('getHealthStatus', { workspaceId });
    const result = await dashboardRepository.getHealthStatus(workspaceId);
    logger.dashboard.info('getHealthStatus completed', { scanners: result.scanners, sources: result.sources, models: result.models });
    return result;
  },
};
