import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { WorkspaceItem, PendingInvitation } from './types';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Workspace API client — CRUD operations and workspace switching.
 *
 * @example
 * ```ts
 * import { workspaceApi } from '@/modules/workspace/api';
 *
 * const { data } = await workspaceApi.list();
 * const detail = await workspaceApi.getDetail('ws_01');
 * await workspaceApi.switchWorkspace('ws_02');
 * ```
 */
export const workspaceApi = {
  /**
   * Fetch all workspaces the current user belongs to.
   * @returns Array of WorkspaceItem objects.
   *
   * @example
   * ```ts
   * const { data } = await workspaceApi.list();
   * data.forEach(w => console.log(`${w.name} (${w.role})`));
   * ```
   */
  list: async () => {
    return _api.Get<ApiResponse<WorkspaceItem[]>>(ENDPOINTS.WORKSPACES.LIST);
  },

  /**
   * Create a new workspace.
   * @param data - Workspace configuration.
   *
   * @example
   * ```ts
   * const { data } = await workspaceApi.create({
   *   name: 'My Team Workspace',
   *   slug: 'my-team',
   *   type: 'organization',
   * });
   * ```
   */
  create: async (data: { name: string; slug?: string; description?: string; type?: 'personal' | 'organization' }) => {
    return _api.Post<ApiResponse<WorkspaceItem>>(ENDPOINTS.WORKSPACES.LIST, data);
  },

  /**
   * Switch the current user's active workspace.
   * @param workspaceId - Target workspace ID.
   *
   * @example
   * ```ts
   * await workspaceApi.switchWorkspace('ws_02');
   * // Session data is now scoped to ws_02
   * ```
   */
  switchWorkspace: async (workspaceId: string) => {
    return _api.Post<ApiResponse<{ currentWorkspaceId: string }>>('/api/v1/workspaces/switch', { currentWorkspaceId: workspaceId });
  },

  /**
   * Fetch workspace details by ID.
   * @param workspaceId - Workspace ID.
   * @returns WorkspaceItem or null.
   *
   * @example
   * ```ts
   * const ws = await workspaceApi.getDetail('ws_01');
   * console.log(ws?.name); // 'SAST Integration'
   * ```
   */
  async getDetail(workspaceId: string) {
    const { data: detailData } = await _api.Get<ApiResponse<WorkspaceItem>>(ENDPOINTS.WORKSPACES.DETAIL(workspaceId)); return detailData;
  },

  /**
   * Update workspace settings (name, slug, description).
   * @param workspaceId - Workspace ID to update.
   * @param data - Fields to update.
   *
   * @example
   * ```ts
   * await workspaceApi.update('ws_01', { name: 'New Name' });
   * ```
   */
  async update(workspaceId: string, data: { name?: string; slug?: string; description?: string }) {
    const { data: updateData } = await _api.Put<ApiResponse<WorkspaceItem>>(ENDPOINTS.WORKSPACES.DETAIL(workspaceId), data); return updateData;
  },

  /**
   * Fetch all pending invitations for the current user.
   * @returns Array of PendingInvitation objects.
   */
  listPendingInvitations: async () => {
    return _api.Get<ApiResponse<PendingInvitation[]>>(ENDPOINTS.WORKSPACES.PENDING_INVITATIONS);
  },

  /**
   * Accept a pending invitation.
   * @param invitationId - The invitation ID to accept.
   */
  acceptInvitation: async (invitationId: string) => {
    return _api.Post<ApiResponse<{ workspaceId: string; role: string }>>(ENDPOINTS.WORKSPACES.ACCEPT_INVITATION(invitationId));
  },

  /**
   * Decline (delete) a pending invitation.
   * @param invitationId - The invitation ID to decline.
   */
  declineInvitation: async (invitationId: string) => {
    return _api.Post<ApiResponse<null>>(ENDPOINTS.WORKSPACES.DECLINE_INVITATION(invitationId));
  },
};
