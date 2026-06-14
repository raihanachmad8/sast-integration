import { Api } from '@/lib/api/client';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { Notification } from '@/commons/types/dashboard';
const _api = Api({ baseUrl: clientEnv.apiUrl });

export const notificationsApi = {
  async list(_userId: string) {
    const { data } = await _api.Get<ApiResponse<Notification[]>>(ENDPOINTS.NOTIFICATIONS.LIST); return data;
  },
  async getUnreadCount(_userId: string) {
    const { data } = await _api.Get<ApiResponse<number>>(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT); return data;
  },
};
