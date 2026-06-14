import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { RepositoryExtended, SourceControl } from '@/commons/types/repositories';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const repositoriesApi = {
  async list(workspaceId: string, params: ListParams & { imported?: boolean }): Promise<PaginatedResponse<RepositoryExtended>> {
    const queryParams: Record<string, string> = {};
    if (params.imported !== undefined) queryParams.imported = String(params.imported);
    const response = await _api.Get<ApiResponse<PaginatedResponse<RepositoryExtended>>>(ENDPOINTS.REPOSITORIES.LIST_WORKSPACE(workspaceId), { ...params, ...queryParams });
    return extractPaginated(response);
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

  async update(workspaceId: string, repoId: string, data: { projectId?: string }) {
    const { data: result } = await _api.Patch<ApiResponse<RepositoryExtended>>(
      `${ENDPOINTS.REPOSITORIES.LIST_WORKSPACE(workspaceId)}/${repoId}`,
      data,
    );
    return result;
  },

  async listBranches(workspaceId: string, repoId: string): Promise<string[]> {
    const { data } = await _api.Get<ApiResponse<string[]>>(ENDPOINTS.REPOSITORIES.BRANCHES(workspaceId, repoId));
    return data ?? [];
  },
};
