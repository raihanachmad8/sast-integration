import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
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
 * ```
 */
export const sourceControlApi = {
  /**
   * Fetch all SCM provider connections.
   * @param workspaceId - The workspace ID.
   * @returns Array of ScmProviderConnection objects.
   */
  async listProviders(workspaceId: string): Promise<ScmProviderConnection[]> {
    const response = await _api.Get<ApiResponse<ScmProviderConnection[]>>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId));
    return response.data ?? [];
  },

  /**
   * Fetch repositories discovered from an SCM provider with import status.
   */
  async listRepos(workspaceId: string, providerId?: string, params?: { page?: number; perPage?: number; search?: string }): Promise<PaginatedResponse<RepositoryCatalog>> {
    if (!providerId) {
      return { data: [], meta: { page: 1, perPage: 10, total: 0, lastPage: 1 } };
    }
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.perPage) queryParams.set('perPage', String(params.perPage));
    if (params?.search) queryParams.set('search', params.search);
    const qs = queryParams.toString();
    const url = ENDPOINTS.SOURCE_CONTROLS.REPOS(workspaceId, providerId) + (qs ? `?${qs}` : '');
    const response = await _api.Get<ApiResponse<Array<{
      id: string; name: string; fullName: string; url: string; branch: string;
      visibility: string; imported: boolean; importId: string | null;
      repositoryId: string | null; webhookStatus: string | null;
    }>>>(url);
    const rows = response.data ?? [];
    const repos: RepositoryCatalog[] = rows.map((row) => ({
      id: row.id,
      provider: 'SCM',
      providerIcon: 'fa-solid fa-code-fork',
      fullName: row.fullName || row.name,
      branch: row.branch || 'main',
      visibility: row.visibility || 'unknown',
      imported: row.imported,
      webhookStatus: row.webhookStatus as 'active' | 'pending' | null,
      project: '',
      sourceControlId: providerId,
      importId: row.importId,
    }));
    return {
      data: repos,
      meta: { page: params?.page ?? 1, perPage: params?.perPage ?? (repos.length || 10), total: repos.length, lastPage: 1 },
    };
  },

  /**
   * Add a new SCM provider connection.
   * @param workspaceId - The workspace ID.
   * @param payload - Provider configuration.
   */
  async addProvider(workspaceId: string, payload: { provider: string; name: string; credentials?: Record<string, unknown> }): Promise<{ sourceControl: ScmProviderConnection; redirectUrl: string | null }> {
    const normalized = { ...payload, provider: payload.provider.toLowerCase() };
    const response = await _api.Post<ApiResponse<{ sourceControl: ScmProviderConnection; redirectUrl: string | null }>>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId), normalized);
    return response.data;
  },

  /**
   * Sync repositories from a single SCM provider.
   * Returns a summary of discovered repos, imported count, and new webhooks.
   */
  async syncProvider(workspaceId: string, providerId: string): Promise<{ provider: string; repos: number; imported: number; newWebhooks: number }> {
    const response = await _api.Post<ApiResponse<{ provider: string; repos: number; imported: number; newWebhooks: number }>>(
      ENDPOINTS.SOURCE_CONTROLS.SYNC(workspaceId, providerId),
    );
    return response.data;
  },

  async updateProvider(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ redirectUrl: string | null }> {
    const normalized = { ...data, provider: data.provider ? String(data.provider).toLowerCase() : undefined };
    const response = await _api.Patch<ApiResponse<{ redirectUrl: string | null }>>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, id), normalized);
    return response.data;
  },

  async testProvider(workspaceId: string, id: string): Promise<{ provider: string; name: string; configured: boolean; configuredKeys: string[] }> {
    const response = await _api.Post<ApiResponse<{ provider: string; name: string; configured: boolean; configuredKeys: string[] }>>(ENDPOINTS.SOURCE_CONTROLS.TEST(workspaceId, id));
    return response.data;
  },

  async importRepository(workspaceId: string, providerId: string, sourceRepositoryId: string, projectId?: string): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.IMPORT(workspaceId, providerId), {
      sourceRepositoryId,
      projectId,
    });
  },

  async uninstallRepository(workspaceId: string, importId: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.UNINSTALL(workspaceId, importId));
  },

  async sendTestEvent(workspaceId: string, _id: string): Promise<{ success: boolean }> {
    const { data } = await _api.Post<ApiResponse<{ success: boolean }>>(ENDPOINTS.SOURCE_CONTROLS.TEST_EVENT(workspaceId));
    return data;
  },

  async deleteProvider(workspaceId: string, id: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, id));
  },

  async disconnectProvider(workspaceId: string, id: string): Promise<void> {
    await _api.Patch<ApiResponse<null>>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, id), { credentials: {} });
  },
};
