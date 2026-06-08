import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ScanProfile } from '@/commons/types/scans';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const scanProfilesApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ScanProfile>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<ScanProfile>>>(ENDPOINTS.SCAN_PROFILES.LIST(workspaceId), params); return data;
  },

  async create(workspaceId: string, _data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<ScanProfile>>(ENDPOINTS.SCAN_PROFILES.LIST(workspaceId), _data); return data;
  },

  async update(workspaceId: string, id: string, _data: Record<string, unknown>) {
    const { data } = await _api.Put<ApiResponse<ScanProfile>>(ENDPOINTS.SCAN_PROFILES.DETAIL(workspaceId, id), _data); return data;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SCAN_PROFILES.DETAIL(workspaceId, id));
  },
};
