/**
 * Workspace module types — shared between frontend and backend.
 *
 * @module commons-types-workspace
 */

/** Workspace list item — workspace sidebar, chooser */
export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  type: 'personal' | 'organization';
  description: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

/** Workspace member view — workspace members page */
export interface WorkspaceMemberView {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

/** Workspace invitation summary — pending invitations list */
export interface WorkspaceInvitationSummary {
  id: string;
  email: string;
  role: string;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
}

/** Pending invitation with workspace info — invitation accept page */
export interface PendingInvitationWithEmail {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
}
