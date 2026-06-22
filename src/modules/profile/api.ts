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
    const { data: result } = await _api.Put<ApiResponse<Profile>>(ENDPOINTS.AUTH.PROFILE_UPDATE, data); return result;
  },

  async getSessions() {
    const { data } = await _api.Get<ApiResponse<Array<{ id: string; userId: string; ipAddress: string; userAgent: string; lastActivity: string; createdAt: string }>>>(ENDPOINTS.AUTH.SESSIONS);
    return data;
  },

  async revokeSession(sessionId: string) {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.AUTH.REVOKE_SESSION(sessionId));
  },

  async getAuditLog() {
    const { data } = await _api.Get<ApiResponse<{ logs: Array<{ id: string; action: string; timestamp: string; details: string }> }>>(ENDPOINTS.AUTH.AUDIT_LOG);
    return data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    await _api.Put<ApiResponse<null>>(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await _api.Post<ApiResponse<{ avatarUrl: string }>>(`${ENDPOINTS.USERS.ME}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async removeAvatar() {
    const { data } = await _api.Delete<ApiResponse<{ avatarUrl: null }>>(`${ENDPOINTS.USERS.ME}/avatar`);
    return data;
  },
};
