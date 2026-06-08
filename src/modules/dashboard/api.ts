import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { DashboardStats, DashboardScan, DashboardFinding, DashboardHealth } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Dashboard API client — workspace overview statistics, scans, findings, and health.
 *
 * @example
 * ```ts
 * import { dashboardApi } from '@/modules/dashboard/api';
 *
 * const stats = await dashboardApi.getStats('ws_01');
 * const scans = await dashboardApi.getScans('ws_01');
 * const findings = await dashboardApi.getFindings('ws_01');
 * const health = await dashboardApi.getHealth('ws_01');
 * ```
 */
export const dashboardApi = {
  /**
   * Fetch dashboard summary statistics.
   * @param _workspaceId - The workspace ID.
   * @returns DashboardStats with connected repos, active scans, critical findings, awaiting AI.
   *
   * @example
   * ```ts
   * const stats = await dashboardApi.getStats('ws_01');
   * console.log(stats.criticalFindings); // 4
   * ```
   */
  async getStats(_workspaceId: string): Promise<DashboardStats> {
    return _api.Get<DashboardStats>(ENDPOINTS.DASHBOARD.STATS);
  },

  /**
   * Fetch recent scans for the dashboard table.
   * @param _workspaceId - The workspace ID.
   * @returns Array of DashboardScan objects.
   *
   * @example
   * ```ts
   * const scans = await dashboardApi.getScans('ws_01');
   * scans.filter(s => s.status === 'Running').length;
   * ```
   */
  async getScans(_workspaceId: string): Promise<DashboardScan[]> {
    return _api.Get<DashboardScan[]>(ENDPOINTS.DASHBOARD.SCANS);
  },

  /**
   * Fetch attention-required findings for the dashboard.
   * @param _workspaceId - The workspace ID.
   * @returns Array of DashboardFinding objects.
   *
   * @example
   * ```ts
   * const findings = await dashboardApi.getFindings('ws_01');
   * findings.filter(f => f.verdict === 'TP').length;
   * ```
   */
  async getFindings(_workspaceId: string): Promise<DashboardFinding[]> {
    return _api.Get<DashboardFinding[]>(ENDPOINTS.DASHBOARD.FINDINGS);
  },

  /**
   * Fetch workspace health status items.
   * @param _workspaceId - The workspace ID.
   * @returns Array of DashboardHealth objects.
   *
   * @example
   * ```ts
   * const health = await dashboardApi.getHealth('ws_01');
   * health.filter(h => h.status === 'Ready').length;
   * ```
   */
  async getHealth(_workspaceId: string): Promise<DashboardHealth[]> {
    return _api.Get<DashboardHealth[]>(ENDPOINTS.DASHBOARD.HEALTH);
  },
};
