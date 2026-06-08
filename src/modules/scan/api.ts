import type { ScanRow, Finding } from '@/commons/types/domain';
import type { ScanDetailData, TriggerScanPayload } from './types';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Scan API client — HTTP calls and mock fallbacks for the scan module.
 */
export const scanApi = {
  /**
   * Fetch all scan rows for the current workspace.
   */
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ScanRow>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<ScanRow>>>(ENDPOINTS.SCANS.LIST(workspaceId), params);
    return data;
  },

  /**
   * Fetch scans for a specific repository.
   */
  async listRepository(workspaceId: string, projectId: string, repoId: string, params: ListParams): Promise<PaginatedResponse<ScanRow>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<ScanRow>>>(ENDPOINTS.SCANS.LIST_REPOSITORY(workspaceId, projectId, repoId), params);
    return data;
  },

  /**
   * Fetch detailed scan information including timeline and AI stats.
   */
  async getDetail(workspaceId: string, scanId: string): Promise<ScanDetailData | null> {
    const { data } = await _api.Get<ApiResponse<ScanDetailData | null>>(ENDPOINTS.SCANS.DETAIL(workspaceId, scanId));
    return data;
  },

  /**
   * Fetch findings for a specific scan.
   */
  async getFindings(workspaceId: string, scanId: string): Promise<Finding[]> {
    const { data } = await _api.Get<ApiResponse<Finding[]>>(ENDPOINTS.SCANS.FINDINGS(workspaceId, scanId));
    return data;
  },

  /**
   * Trigger a new scan on a repository.
   */
  async trigger(workspaceId: string, projectId: string, repoId: string, payload: TriggerScanPayload): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.SCANS.RUN(workspaceId, projectId, repoId), payload);
  },
};
