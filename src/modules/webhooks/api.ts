import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { WebhookRow } from '@/commons/types/webhooks';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const webhooksApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<WebhookRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<WebhookRow>>>(ENDPOINTS.WEBHOOKS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  async create(workspaceId: string, _data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<WebhookRow>>(ENDPOINTS.WEBHOOKS.LIST(workspaceId), _data); return data;
  },

  async update(workspaceId: string, id: string, _data: Record<string, unknown>) {
    const { data } = await _api.Put<ApiResponse<WebhookRow>>(ENDPOINTS.WEBHOOKS.DETAIL(workspaceId, id), _data); return data;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.WEBHOOKS.DETAIL(workspaceId, id));
  },

  async test(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<{ success: boolean; status: number }>>(ENDPOINTS.WEBHOOKS.TEST(workspaceId, id));
    return data;
  },
};
