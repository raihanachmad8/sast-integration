import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { DashboardStats, DashboardScan, DashboardFinding, DashboardHealth } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const dashboardApi = {
  async getStats(workspaceId: string): Promise<DashboardStats> {
    const { data } = await _api.Get<ApiResponse<DashboardStats>>(`${ENDPOINTS.DASHBOARD.STATS}?workspaceId=${workspaceId}`);
    return data;
  },

  async getScans(workspaceId: string): Promise<DashboardScan[]> {
    const { data } = await _api.Get<ApiResponse<DashboardScan[]>>(`${ENDPOINTS.DASHBOARD.SCANS}?workspaceId=${workspaceId}`);
    return data;
  },

  async getFindings(workspaceId: string): Promise<DashboardFinding[]> {
    const { data } = await _api.Get<ApiResponse<DashboardFinding[]>>(`${ENDPOINTS.DASHBOARD.FINDINGS}?workspaceId=${workspaceId}`);
    return data;
  },

  async getHealth(workspaceId: string): Promise<DashboardHealth> {
    const { data } = await _api.Get<ApiResponse<DashboardHealth>>(`${ENDPOINTS.DASHBOARD.HEALTH}?workspaceId=${workspaceId}`);
    return data;
  },
};
