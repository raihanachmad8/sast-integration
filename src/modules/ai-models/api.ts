import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { AiModelRow } from '@/commons/types/ai-models';

const _api = Api({ baseUrl: clientEnv.apiUrl });

function fromServer(raw: Record<string, unknown>): AiModelRow {
  return {
    id: raw.id as string,
    workspaceId: raw.workspace_id as string,
    name: raw.name as string,
    provider: raw.provider as string,
    baseUrl: raw.base_url as string,
    role: raw.role as 'primary' | 'fallback',
    priority: raw.priority as number,
    promptPreset: raw.prompt_preset as string,
    status: (raw.status as 'reachable' | 'unreachable') ?? 'unreachable',
    lastTestedAt: (raw.last_tested_at as string) ?? null,
    createdAt: raw.created_at as string,
  };
}

export const aiModelsApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<AiModelRow>> {
    const response = await _api.Get<ApiResponse<Record<string, unknown>[]>>(ENDPOINTS.AI_MODELS.LIST(workspaceId), params);
    const items = Array.isArray(response.data) ? response.data.map(fromServer) : [];
    return {
      data: items,
      meta: response.meta?.pagination
        ? { page: response.meta.pagination.page, perPage: response.meta.pagination.perPage, total: response.meta.pagination.total, lastPage: response.meta.pagination.totalPages }
        : { page: 1, perPage: 10, total: items.length, lastPage: 1 },
    };
  },

  async create(workspaceId: string, data: Record<string, unknown>) {
    const { data: result } = await _api.Post<ApiResponse<Record<string, unknown>>>(ENDPOINTS.AI_MODELS.LIST(workspaceId), data);
    return result ? fromServer(result) : null;
  },

  async update(workspaceId: string, id: string, data: Record<string, unknown>) {
    const { data: result } = await _api.Put<ApiResponse<Record<string, unknown>>>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id), data);
    return result ? fromServer(result) : null;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id));
  },

  async test(workspaceId: string, id: string) {
    const { data } = await _api.Post<ApiResponse<{ status: string }>>(`${ENDPOINTS.AI_MODELS.DETAIL(workspaceId, id)}/test`);
    return data;
  },
};
