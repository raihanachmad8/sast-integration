/**
 * Workspace item returned by the workspace list/detail API.
 *
 * @example
 * ```ts
 * const ws: WorkspaceItem = {
 *   id: 'ws_01',
 *   name: 'SAST Integration',
 *   slug: 'sast-integration',
 *   type: 'organization',
 *   description: 'Main workspace for SAST platform development.',
 *   avatarUrl: null,
 *   role: 'owner',
 *   joinedAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export interface WorkspaceItem {
  /** Unique workspace ID. */
  id: string;
  /** Workspace display name. */
  name: string;
  /** URL-friendly workspace slug. */
  slug: string;
  /** Workspace type. */
  type: 'personal' | 'organization';
  /** Optional workspace description. */
  description: string | null;
  /** Optional avatar URL. */
  avatarUrl: string | null;
  /** Current user's role in this workspace. */
  role: string;
  /** ISO 8601 timestamp of when the user joined. */
  joinedAt: string;
}

/**
 * Pending workspace invitation for the current user.
 * Shown in workspace chooser as invitation cards.
 */
export interface PendingInvitation {
  /** Invitation ID. */
  id: string;
  /** Invitee email. */
  email: string;
  /** Role to assign. */
  role: string;
  /** Workspace ID being invited to. */
  workspaceId: string;
  /** Workspace name. */
  workspaceName: string;
  /** Workspace slug. */
  workspaceSlug: string;
  /** Name of who sent the invite. */
  invitedBy: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt: string;
}
