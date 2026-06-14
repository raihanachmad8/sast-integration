import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ScheduleRow } from '@/commons/types/schedules';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Schedules API client — cron-based recurring scan configurations.
 *
 * @example
 * ```ts
 * import { schedulesApi } from '@/modules/schedules/api';
 *
 * const schedules = await schedulesApi.list('ws_01', { page: 1, perPage: 10 });
 * schedules.data.forEach(s => console.log(`${s.repositoryName}: ${s.cronExpression}`));
 * ```
 */
export const schedulesApi = {
  /**
   * Fetch all schedules in the current workspace.
   * @param workspaceId - The workspace ID.
   * @param params - Pagination parameters.
   * @returns Paginated array of ScheduleRow objects.
   *
   * @example
   * ```ts
   * const schedules = await schedulesApi.list('ws_01', { page: 1, perPage: 10 });
   * ```
   */
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ScheduleRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScheduleRow>>>(ENDPOINTS.SCHEDULES.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  async create(workspaceId: string, _data: Record<string, unknown>) {
    const { data } = await _api.Post<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.LIST(workspaceId), _data); return data;
  },

  async update(workspaceId: string, id: string, _data: Record<string, unknown>) {
    const { data } = await _api.Put<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, id), _data); return data;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, id));
  },

  async toggle(workspaceId: string, id: string, enabled: boolean) {
    const { data } = await _api.Put<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.TOGGLE(workspaceId, id), { enabled }); return data;
  },
};
