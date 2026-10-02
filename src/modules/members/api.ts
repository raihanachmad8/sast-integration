/**
 * Members API module.
 *
 * Provides functions for managing workspace members and invitations.
 *
 * @example
 * ```ts
 * import { listMembers, inviteMember } from '@/modules/members/api';
 *
 * const members = await listMembers('ws-123');
 * await inviteMember('ws-123', { email: 'user@example.com', role: 'reviewer' });
 * ```
 */

import { apiFetch, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/**
 * Workspace member.
 */
export interface Member {
  /** User ID */
  userId: string;
  /** User name */
  name: string;
  /** User email */
  email: string;
  /** Member role */
  role: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Join timestamp */
  joinedAt: string;
}

/**
 * Pending invitation.
 */
export interface Invitation {
  /** Invitation ID */
  id: string;
  /** Invitee email */
  email: string;
  /** Invited role */
  role: string;
  /** Inviter name */
  invitedBy: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * List all members in a workspace.
 *
 * @param workspaceId - The workspace ID
 * @returns Promise resolving to array of members
 *
 * @example
 * ```ts
 * const members = await listMembers('ws-123');
 * console.log(`${members.length} members`);
 * ```
 */
export async function listMembers(workspaceId: string): Promise<Member[]> {
  return apiFetch<Member[]>(ENDPOINTS.WORKSPACES.MEMBERS(workspaceId));
}

/**
 * Update a member's role.
 *
 * @param workspaceId - The workspace ID
 * @param userId - The user ID to update
 * @param role - New role
 * @returns Promise resolving when complete
 *
 * @example
 * ```ts
 * await updateMemberRole('ws-123', 'user-456', 'manager');
 * ```
 */
export async function updateMemberRole(workspaceId: string, userId: string, role: string): Promise<void> {
  await apiPatch(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId), { role });
}

/**
 * Remove a member from the workspace.
 *
 * @param workspaceId - The workspace ID
 * @param userId - The user ID to remove
 * @returns Promise resolving when complete
 *
 * @example
 * ```ts
 * await removeMember('ws-123', 'user-456');
 * ```
 */
export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await apiDelete(ENDPOINTS.WORKSPACES.MEMBER(workspaceId, userId));
}

/**
 * List pending invitations.
 *
 * @param workspaceId - The workspace ID
 * @returns Promise resolving to array of invitations
 *
 * @example
 * ```ts
 * const invitations = await listInvitations('ws-123');
 * console.log(`${invitations.length} pending`);
 * ```
 */
export async function listInvitations(workspaceId: string): Promise<Invitation[]> {
  return apiFetch<Invitation[]>(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId));
}

/**
 * Send an invitation.
 *
 * @param workspaceId - The workspace ID
 * @param data - Invitation data (email, role)
 * @returns Promise resolving when complete
 *
 * @example
 * ```ts
 * await inviteMember('ws-123', { email: 'new@example.com', role: 'reviewer' });
 * ```
 */
export async function inviteMember(workspaceId: string, data: { email: string; role: string }): Promise<void> {
  await apiPost(ENDPOINTS.WORKSPACES.INVITATIONS(workspaceId), data);
}

/**
 * Revoke an invitation.
 *
 * @param workspaceId - The workspace ID
 * @param invitationId - The invitation ID to revoke
 * @returns Promise resolving when complete
 *
 * @example
 * ```ts
 * await revokeInvitation('ws-123', 'inv-789');
 * ```
 */
export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await apiDelete(ENDPOINTS.WORKSPACES.INVITATION(workspaceId, invitationId));
}
