import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ReportRow } from '@/commons/types/reports';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const reportsApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ReportRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ReportRow>>>(ENDPOINTS.REPORTS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  async generate(workspaceId: string, data: { type: string; title?: string; format?: string; range?: string }) {
    const { data: result } = await _api.Post<ApiResponse<ReportRow>>(ENDPOINTS.REPORTS.LIST(workspaceId), data);
    return result;
  },

  async get(workspaceId: string, reportId: string) {
    const { data } = await _api.Get<ApiResponse<ReportRow>>(ENDPOINTS.REPORTS.DETAIL(workspaceId, reportId));
    return data;
  },

  async delete(workspaceId: string, reportId: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.REPORTS.DETAIL(workspaceId, reportId));
  },

  async getDownloadUrl(workspaceId: string, reportId: string): Promise<string> {
    return ENDPOINTS.REPORTS.DOWNLOAD(workspaceId, reportId);
  },
};
