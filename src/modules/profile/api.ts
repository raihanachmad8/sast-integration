import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { Profile } from '@/commons/types/auth';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const profileApi = {
  async get(_userId: string) {
    const { data } = await _api.Get<ApiResponse<Profile>>(ENDPOINTS.USERS.ME); return data;
  },

  async update(_userId: string, data: { name?: string; username?: string; bio?: string; timezone?: string; language?: string }) {
    const { data: result } = await _api.Patch<ApiResponse<Profile>>(ENDPOINTS.USERS.ME, data); return result;
  },

  async getSessions() {
    const { data } = await _api.Get<ApiResponse<{ sessions: Array<{ id: string; userId: string; ipAddress: string; userAgent: string; lastActivity: string; createdAt: string }> }>>('/auth/sessions');
    return data;
  },

  async revokeSession(sessionId: string) {
    await _api.Delete<ApiResponse<null>>(`/auth/sessions/${sessionId}`);
  },

  async getAuditLog() {
    const { data } = await _api.Get<ApiResponse<{ logs: Array<{ id: string; action: string; timestamp: string; details: string }> }>>('/auth/audit-log');
    return data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    await _api.Post<ApiResponse<null>>('/auth/change-password', data);
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await _api.Post<ApiResponse<{ avatarUrl: string }>>(`${ENDPOINTS.USERS.ME}/avatar`, formData);
    return data;
  },

  async removeAvatar() {
    const { data } = await _api.Delete<ApiResponse<{ avatarUrl: null }>>(`${ENDPOINTS.USERS.ME}/avatar`);
    return data;
  },
};
