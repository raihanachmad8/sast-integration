import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { CreateWebhookInput } from '@/commons/schemas/webhook.schema';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { WebhookRow } from '@/commons/types/webhooks';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const webhooksApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<WebhookRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<WebhookRow>>>(ENDPOINTS.WEBHOOKS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  async create(workspaceId: string, data: CreateWebhookInput) {
    const { data: result } = await _api.Post<ApiResponse<WebhookRow>>(ENDPOINTS.WEBHOOKS.LIST(workspaceId), data); return result;
  },

  async update(workspaceId: string, id: string, data: Partial<CreateWebhookInput>) {
    const { data: result } = await _api.Put<ApiResponse<WebhookRow>>(ENDPOINTS.WEBHOOKS.DETAIL(workspaceId, id), data); return result;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.WEBHOOKS.DETAIL(workspaceId, id));
  },

  async test(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<{ success: boolean; status: number }>>(ENDPOINTS.WEBHOOKS.TEST(workspaceId, id));
    return data;
  },
};
