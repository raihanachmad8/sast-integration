import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { DashboardStats, DashboardScan, DashboardFinding, DashboardHealth } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const dashboardApi = {
  async getStats(_workspaceId: string): Promise<DashboardStats> {
    const { data } = await _api.Get<ApiResponse<DashboardStats>>(ENDPOINTS.DASHBOARD.STATS);
    return data;
  },

  async getScans(_workspaceId: string): Promise<DashboardScan[]> {
    const { data } = await _api.Get<ApiResponse<DashboardScan[]>>(ENDPOINTS.DASHBOARD.SCANS);
    return data;
  },

  async getFindings(_workspaceId: string): Promise<DashboardFinding[]> {
    const { data } = await _api.Get<ApiResponse<DashboardFinding[]>>(ENDPOINTS.DASHBOARD.FINDINGS);
    return data;
  },

  async getHealth(_workspaceId: string): Promise<DashboardHealth> {
    const { data } = await _api.Get<ApiResponse<DashboardHealth>>(ENDPOINTS.DASHBOARD.HEALTH);
    return data;
  },
};
