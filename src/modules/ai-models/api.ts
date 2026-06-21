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
    workspaceId: raw.workspaceId as string,
    name: raw.name as string,
    provider: raw.provider as string,
    baseUrl: raw.baseUrl as string,
    role: raw.role as 'primary' | 'fallback',
    priority: raw.priority as number,
    promptPreset: raw.promptPreset as string,
    status: (raw.status as 'reachable' | 'unreachable') ?? 'unreachable',
    lastTestedAt: (raw.lastTestedAt as string) ?? null,
    createdAt: raw.createdAt as string,
  };
}

export const aiModelsApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<AiModelRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>(ENDPOINTS.AI_MODELS.LIST(workspaceId), params);
    const result = extractPaginated(response);
    return {
      data: result.data.map(fromServer),
      meta: result.meta,
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
