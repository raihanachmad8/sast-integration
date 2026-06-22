import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { QualityGate } from '@/commons/types/reports';
const _api = Api({ baseUrl: clientEnv.apiUrl });

function mapGate(raw: Record<string, unknown>): QualityGate {
  return {
    id: raw.id as string,
    workspaceId: raw.workspaceId as string,
    threshold: raw.threshold as string,
    failOnCritical: Boolean(raw.failOnCritical),
    failOnHighTp: Boolean(raw.failOnHighTp),
    failOnHigh: Boolean(raw.failOnHigh),
    failOnMedium: Boolean(raw.failOnMedium),
    failOnLow: Boolean(raw.failOnLow),
    failOnPending: Boolean(raw.failOnPending),
    failOnTp: Boolean(raw.failOnTp),
    warnOnPending: Boolean(raw.warnOnPending),
    requireHumanAck: Boolean(raw.requireHumanAck),
    pendingBehavior: raw.pendingBehavior as string,
    createdAt: raw.createdAt as string,
  };
}

export const qualityGatesApi = {
  async getConfig() {
    const { data } = await _api.Get<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG);
    return data ? mapGate(data) : null;
  },

  async updateConfig(data: Record<string, unknown>) {
    const { data: result } = await _api.Put<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG, data);
    return result ? mapGate(result) : null;
  },
};
