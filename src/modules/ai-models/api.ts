import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { AiModelRow } from '@/commons/types/ai-models';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const aiModelsApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<AiModelRow>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<AiModelRow>>>(ENDPOINTS.AI_MODELS.LIST(workspaceId), params); return data;
  },

  async create(workspaceId: string, _data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<AiModelRow>>(ENDPOINTS.AI_MODELS.LIST(workspaceId), _data); return data;
  },

  async update(workspaceId: string, id: string, _data: Record<string, unknown>) {
    const { data } = await _api.Put<ApiResponse<AiModelRow>>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id), _data); return data;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id));
  },
};
