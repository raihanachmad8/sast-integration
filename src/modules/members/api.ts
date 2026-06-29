import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/** Workspace member with user details. */
export interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  joinedAt: string;
}

/**
 * Members API client — CRUD operations for workspace members.
 */
export const membersApi = {
  async list(workspaceId: string, params?: Record<string, unknown>): Promise<PaginatedResponse<Member>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<Member>>>(ENDPOINTS.WORKSPACES.MEMBERS(workspaceId), params);
    return extractPaginated(response);
  },

  async changeRole(workspaceId: string, userId: string, role: string): Promise<void> {
    await _api.Patch<ApiResponse<null>>(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId), { role });
  },

  async remove(workspaceId: string, userId: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId));
  },
};
