import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { InvitationListQuery as _InvitationListQuery } from '@/commons/schemas/member.schema';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Pending workspace invitation.
 */
export interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Invitations API client — CRUD operations for workspace invitations.
 */
export const invitationsApi = {
  async list(workspaceId: string, params?: Record<string, unknown>): Promise<PaginatedResponse<Invitation>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<Invitation>>>(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId), params);
    return extractPaginated(response);
  },

  async invite(workspaceId: string, data: { email: string; role: string }): Promise<void> {
    await _api.Post<ApiResponse<null>>(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId), data);
  },

  async revoke(workspaceId: string, invitationId: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.WORKSPACES.INVITATION(workspaceId, invitationId));
  },
};
