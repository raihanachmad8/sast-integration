import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
const _api = Api({ baseUrl: clientEnv.apiUrl });

/** Quality gate configuration — workspace-level pass/fail rules. */
export interface QualityGateConfig {
  id: string;
  workspaceId: string;
  threshold: string;
  failOnCritical: boolean;
  failOnHighTp: boolean;
  failOnHigh: boolean;
  failOnMedium: boolean;
  failOnLow: boolean;
  failOnPending: boolean;
  failOnTp: boolean;
  warnOnPending: boolean;
  requireHumanAck: boolean;
  pendingBehavior: string;
  createdAt: string;
}

function mapGate(raw: Record<string, unknown>): QualityGateConfig {
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
  async getConfig(): Promise<QualityGateConfig | null> {
    const { data } = await _api.Get<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG);
    return data ? mapGate(data) : null;
  },

  async updateConfig(data: Record<string, unknown>): Promise<QualityGateConfig | null> {
    const { data: result } = await _api.Put<ApiResponse<Record<string, unknown>>>(ENDPOINTS.QUALITY_GATES.CONFIG, data);
    return result ? mapGate(result) : null;
  },
};
