import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { QualityGate } from '@/commons/types/reports';
const _api = Api({ baseUrl: clientEnv.apiUrl });

function mapGate(raw: Record<string, unknown>): QualityGate {
  return {
    id: raw.id as string,
    workspaceId: raw.workspace_id as string,
    threshold: raw.threshold as string,
    failOnCritical: Boolean(raw.fail_on_critical),
    failOnHighTp: Boolean(raw.fail_on_high_tp),
    warnOnPending: Boolean(raw.warn_on_pending),
    requireHumanAck: Boolean(raw.require_human_ack),
    pendingBehavior: raw.pending_behavior as string,
    createdAt: raw.created_at as string,
  };
}

export const qualityGatesApi = {
  async list() {
    const { data } = await _api.Get<ApiResponse<Record<string, unknown>[]>>(ENDPOINTS.QUALITY_GATES.CONFIG);
    return Array.isArray(data) ? data.map(mapGate) : [];
  },

  async getConfig() {
    const { data } = await _api.Get<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG);
    return data ? mapGate(data) : null;
  },

  async updateConfig(data: Record<string, unknown>) {
    const { data: result } = await _api.Put<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG, data);
    return result ? mapGate(result) : null;
  },

  async getResults() {
    const { data } = await _api.Get<ApiResponse<unknown>>(ENDPOINTS.QUALITY_GATES.RESULTS);
    return data;
  },
};
