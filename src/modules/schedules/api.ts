import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { CreateScheduleInput, UpdateScheduleInput } from '@/commons/schemas/schedule.schema';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import type { ScheduleRow } from '@/commons/types/schedules';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const schedulesApi = {
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<ScheduleRow>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<ScheduleRow>>>(ENDPOINTS.SCHEDULES.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  async create(workspaceId: string, data: CreateScheduleInput) {
    const { data: result } = await _api.Post<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.LIST(workspaceId), data); return result;
  },

  async update(workspaceId: string, id: string, data: UpdateScheduleInput) {
    const { data: result } = await _api.Put<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, id), data); return result;
  },

  async delete(workspaceId: string, id: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.SCHEDULES.DETAIL(workspaceId, id));
  },

  async toggle(workspaceId: string, id: string, enabled: boolean) {
    const { data } = await _api.Put<ApiResponse<ScheduleRow>>(ENDPOINTS.SCHEDULES.TOGGLE(workspaceId, id), { enabled }); return data;
  },
};
