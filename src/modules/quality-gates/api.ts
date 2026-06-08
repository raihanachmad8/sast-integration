import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { QualityGate } from '@/commons/types/reports';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const qualityGatesApi = {
  async list() {
    const { data } = await _api.Get<ApiResponse<QualityGate[]>>(ENDPOINTS.QUALITY_GATES.CONFIG); return data;
  },

  async getConfig() {
    const { data } = await _api.Get<ApiResponse<QualityGate>>(ENDPOINTS.QUALITY_GATES.CONFIG); return data;
  },

  async updateConfig(data: Record<string, unknown>) {
    const { data: result } = await _api.Put<ApiResponse<unknown>>(ENDPOINTS.QUALITY_GATES.CONFIG, data); return result;
  },

  async getResults() {
    const { data } = await _api.Get<ApiResponse<unknown>>(ENDPOINTS.QUALITY_GATES.RESULTS); return data;
  },
};
