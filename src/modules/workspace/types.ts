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
