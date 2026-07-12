/**
 * Invitation module types — shared between frontend and backend.
 *
 * @module commons-types-invitation
 */

/** Invitation list item — invitations page */
export interface InvitationListItem {
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
