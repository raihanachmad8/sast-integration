import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ReportRow } from '@/commons/types/reports';
import { clientEnv } from '@/config/client-env';
import { Api, getAccessToken, setAccessToken } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

async function fetchWithRefresh<T>(url: string): Promise<T> {
  const token = getAccessToken();
  let res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  if (res.status === 401) {
    const refreshRes = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'x-refresh-request': '1' },
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const { data } = await refreshRes.json();
      const newToken = data?.accessToken;
      if (newToken) {
        setAccessToken(newToken);
        res = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
      }
    }
  }

  if (!res.ok) throw new Error(`Preview fetch failed: ${res.status}`);
  return res.json() as Promise<T>;
}

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

  async getPreviewUrl(workspaceId: string, reportId: string): Promise<string> {
    return ENDPOINTS.REPORTS.PREVIEW(workspaceId, reportId);
  },

  async fetchPreviewJson<T = unknown>(workspaceId: string, reportId: string): Promise<T> {
    const url = ENDPOINTS.REPORTS.PREVIEW(workspaceId, reportId);
    const json = await fetchWithRefresh<{ data: T }>(url);
    return json.data;
  },
};
