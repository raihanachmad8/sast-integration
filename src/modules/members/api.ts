import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Workspace member with user details.
 *
 * @example
 * ```ts
 * const member: Member = {
 *   userId: 'usr_01',
 *   name: 'Alice Tan',
 *   email: 'alice@sast.dev',
 *   role: 'owner',
 *   avatarUrl: null,
 *   joinedAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export interface Member {
  /** User ID. */
  userId: string;
  /** User display name. */
  name: string;
  /** User email. */
  email: string;
  /** Role in the workspace. */
  role: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
  /** ISO 8601 join timestamp. */
  joinedAt: string;
}

/**
 * Pending workspace invitation.
 *
 * @example
 * ```ts
 * const inv: Invitation = {
 *   id: 'inv_01',
 *   email: 'frank@sast.dev',
 *   role: 'member',
 *   invitedBy: 'Alice Tan',
 *   expiresAt: '2026-06-03T08:00:00Z',
 *   createdAt: '2026-05-20T08:00:00Z',
 * };
 * ```
 */
export interface Invitation {
  /** Invitation ID. */
  id: string;
  /** Invitee email. */
  email: string;
  /** Role to assign. */
  role: string;
  /** Name of who sent the invite. */
  invitedBy: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/**
 * Fetch all members in a workspace.
 * @param workspaceId - The workspace ID.
 * @returns Array of Member objects.
 *
 * @example
 * ```ts
 * const members = await listMembers('ws_01');
 * members.forEach(m => console.log(`${m.name} (${m.role})`));
 * ```
 */
export async function listMembers(workspaceId: string, params?: ListParams): Promise<PaginatedResponse<Member>> {
  const response = await _api.Get<ApiResponse<PaginatedResponse<Member>>>(ENDPOINTS.WORKSPACES.MEMBERS(workspaceId), params);
  return extractPaginated(response);
}

/**
 * Update a member's role in the workspace.
 * @param workspaceId - The workspace ID.
 * @param userId - The user ID to update.
 * @param role - New role to assign.
 *
 * @example
 * ```ts
 * await updateMemberRole('ws_01', 'usr_02', 'manager');
 * ```
 */
export async function updateMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
  await _api.Patch<ApiResponse<null>>(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId), { role });
}

/**
 * Remove a member from the workspace.
 * @param workspaceId - The workspace ID.
 * @param userId - The user ID to remove.
 *
 * @example
 * ```ts
 * await removeMember('ws_01', 'usr_04');
 * ```
 */
export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await _api.Delete<ApiResponse<null>>(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId));
}

/**
 * Fetch pending invitations for a workspace.
 * @param workspaceId - The workspace ID.
 * @returns Array of Invitation objects.
 *
 * @example
 * ```ts
 * const invitations = await listInvitations('ws_01');
 * invitations.forEach(i => console.log(`Invited: ${i.email} (${i.role})`));
 * ```
 */
export async function listInvitations(workspaceId: string, params?: ListParams): Promise<PaginatedResponse<Invitation>> {
  const response = await _api.Get<ApiResponse<PaginatedResponse<Invitation>>>(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId), params);
  return extractPaginated(response);
}

/**
 * Send a workspace invitation to a user by email.
 * @param workspaceId - The workspace ID.
 * @param data - Invitation data (email + role).
 *
 * @example
 * ```ts
 * await inviteMember('ws_01', { email: 'frank@sast.dev', role: 'member' });
 * ```
 */
export async function inviteMember(workspaceId: string, data: { email: string; role: string }): Promise<void> {
  await _api.Post<ApiResponse<null>>(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId), data);
}

/**
 * Revoke (cancel) a pending invitation.
 * @param workspaceId - The workspace ID.
 * @param invitationId - The invitation ID to revoke.
 *
 * @example
 * ```ts
 * await revokeInvitation('ws_01', 'inv_01');
 * ```
 */
export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await _api.Delete<ApiResponse<null>>(ENDPOINTS.WORKSPACES.INVITATION(workspaceId, invitationId));
}
