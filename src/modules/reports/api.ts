import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ReportRow } from '@/commons/types/reports';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const reportsApi = {
  async list(params: ListParams): Promise<PaginatedResponse<ReportRow>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<ReportRow>>>(ENDPOINTS.REPORTS.LIST, params); return data;
  },

  async generate(_data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<ReportRow>>(ENDPOINTS.REPORTS.LIST, _data); return data;
  },

  async delete(reportId: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.REPORTS.DETAIL(reportId));
  },
};
