import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { FindingExtended, FindingGroup } from '@/commons/types/findings';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

import type { FindingListParams, FindingListResponse } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Findings API client — finding list, filtering, and grouping.
 *
 * @example
 * ```ts
 * import { findingsApi } from '@/modules/findings/api';
 *
 * const result = await findingsApi.list('ws_01', { page: 1, perPage: 10 });
 * const groups = await findingsApi.listGroups('ws_01', 'proj_01');
 * ```
 */
export const findingsApi = {
  /**
   * Fetch findings with server-side pagination, filtering, and sorting.
   * @param workspaceId - The workspace ID.
   * @param params - Pagination, filter, and sort parameters.
   * @returns Paginated result with data array and meta (total, page, perPage, lastPage).
   */
  async list(workspaceId: string, params?: Partial<FindingListParams>): Promise<FindingListResponse<FindingExtended>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<FindingExtended>>>(ENDPOINTS.FINDINGS.LIST(workspaceId), { ...params });
    return extractPaginated(response);
  },

  /**
   * Fetch all findings (legacy — for bulk operations).
   */
  async listAll(workspaceId: string): Promise<FindingExtended[]> {
    const { data } = await _api.Get<ApiResponse<FindingExtended[]>>(ENDPOINTS.FINDINGS.LIST(workspaceId));
    return data;
  },

  /**
   * Fetch finding groups (deduplicated) for a specific project.
   * @param workspaceId - The workspace ID.
   * @param projectId - The project ID.
   * @returns Array of FindingGroup objects.
   */
  async listGroups(workspaceId: string, projectId: string) {
    const { data } = await _api.Get<ApiResponse<FindingGroup[]>>(ENDPOINTS.FINDINGS.GROUPS(workspaceId, projectId));
    return data;
  },

  async get(workspaceId: string, id: string) {
    const { data } = await _api.Get<ApiResponse<FindingExtended>>(ENDPOINTS.FINDINGS.DETAIL(workspaceId, id));
    return data;
  },

  async update(workspaceId: string, id: string, payload: Record<string, unknown>) {
    const { data } = await _api.Patch<ApiResponse<FindingExtended>>(ENDPOINTS.FINDINGS.DETAIL(workspaceId, id), payload);
    return data;
  },

  async bulkUpdate(workspaceId: string, ids: string[], payload: Record<string, unknown>) {
    const { data } = await _api.Put<ApiResponse<{ updated: number }>>(ENDPOINTS.FINDINGS.BULK(workspaceId), { ids, payload });
    return data;
  },

  async aiVerify(workspaceId: string, findingIds: string[]) {
    const { data } = await _api.Post<ApiResponse<{ queued: number }>>(ENDPOINTS.FINDINGS.AI_VERIFY(workspaceId), { findingIds });
    return data;
  },

  async verify(workspaceId: string, findingId: string, modelId?: string) {
    return _api.Post<ApiResponse<{ result: unknown }>>(
      ENDPOINTS.FINDINGS.VERIFY(workspaceId, findingId),
      modelId ? { modelId } : {},
    );
  },
};
