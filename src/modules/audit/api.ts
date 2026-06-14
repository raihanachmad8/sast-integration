import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { AuditLog, ActivityLog } from '@/commons/types/dashboard';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const auditApi = {
  async listAuditLogs() {
    const { data } = await _api.Get<ApiResponse<AuditLog[]>>(ENDPOINTS.AUDIT.LOGS); return data;
  },
  async listActivityLogs() {
    const { data } = await _api.Get<ApiResponse<ActivityLog[]>>(ENDPOINTS.AUDIT.ACTIVITY_LOGS); return data;
  },
};
