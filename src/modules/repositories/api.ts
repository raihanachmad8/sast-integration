import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { RepositoryExtended, SourceControl } from '@/commons/types/repositories';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const repositoriesApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<RepositoryExtended>> {
    const { data } = await _api.Get<ApiResponse<PaginatedResponse<RepositoryExtended>>>(ENDPOINTS.REPOSITORIES.LIST_WORKSPACE(workspaceId), params); return data;
  },

  async listSourceControls(workspaceId: string) {
    const { data } = await _api.Get<ApiResponse<SourceControl[]>>(ENDPOINTS.SOURCE_CONTROLS.REPOS(workspaceId)); return data;
  },

  async createSourceControl(workspaceId: string, _data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<SourceControl>>(ENDPOINTS.SOURCE_CONTROLS.REPOS(workspaceId), _data); return data;
  },

  async deleteSourceControl(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(`${ENDPOINTS.SOURCE_CONTROLS.REPOS(workspaceId)}/${id}`);
  },
};
