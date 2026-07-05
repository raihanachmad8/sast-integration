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
