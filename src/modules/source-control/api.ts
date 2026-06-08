import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ScmProviderConnection, RepositoryCatalog } from './types';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Source control API client — SCM provider connections and repository management.
 *
 * @example
 * ```ts
 * import { sourceControlApi } from '@/modules/source-control/api';
 *
 * const providers = await sourceControlApi.listProviders('ws_01');
 * const repos = await sourceControlApi.listRepos('ws_01', 'sc_01');
 * await sourceControlApi.addProvider('ws_01', { name: 'GitHub', type: 'github', token: 'ghp_xxx', org: 'acme' });
 * await sourceControlApi.syncRepos('ws_01', { providerId: 'sc_01', fullNames: ['acme/backend-api'] });
 * ```
 */
export const sourceControlApi = {
  /**
   * Fetch all SCM provider connections.
   * @param workspaceId - The workspace ID.
   * @returns Array of ScmProviderConnection objects.
   */
  async listProviders(workspaceId: string): Promise<ScmProviderConnection[]> {
    return _api.Get<ScmProviderConnection[]>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId));
  },

  /**
   * Fetch repositories discovered from an SCM provider.
   * @param workspaceId - The workspace ID.
   * @param providerId - The provider connection ID.
   * @returns Array of RepositoryCatalog objects.
   */
  async listRepos(workspaceId: string, providerId: string, params?: ListParams): Promise<PaginatedResponse<RepositoryCatalog>> {
    return _api.Get<PaginatedResponse<RepositoryCatalog>>(`${ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, providerId)}/repos`, params);
  },

  /**
   * Add a new SCM provider connection.
   * @param workspaceId - The workspace ID.
   * @param payload - Provider configuration.
   */
  async addProvider(workspaceId: string, payload: { name: string; type: string; token: string; org: string }): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId), payload);
  },

  /**
   * Sync repositories from an SCM provider.
   * @param workspaceId - The workspace ID.
   * @param payload - Sync configuration.
   */
  async syncRepos(workspaceId: string, payload: { providerId: string; fullNames: string[] }): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.SYNC(workspaceId, payload.providerId), {
      fullNames: payload.fullNames,
    });
  },

  async updateProvider(workspaceId: string, id: string, data: Record<string, unknown>): Promise<void> {
    await _api.Put<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, id), data);
  },

  async testProvider(workspaceId: string, id: string): Promise<{ success: boolean }> {
    const { data } = await _api.Post<ApiResponse<{ success: boolean }>>(ENDPOINTS.SOURCE_CONTROLS.TEST(workspaceId, id));
    return data;
  },

  async importRepository(workspaceId: string, providerId: string, repoFullName: string): Promise<void> {
    await _api.Post<ApiResponse<null>>(`${ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, providerId)}/import`, { fullName: repoFullName });
  },

  async sendTestEvent(workspaceId: string, _id: string): Promise<{ success: boolean }> {
    const { data } = await _api.Post<ApiResponse<{ success: boolean }>>(ENDPOINTS.SOURCE_CONTROLS.TEST_EVENT(workspaceId));
    return data;
  },

  async deleteProvider(workspaceId: string, id: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, id));
  },
};
