/**
 * Member module types — shared between frontend and backend.
 *
 * @module commons-types-member
 */

/** Member view — workspace members page */
export interface MemberView {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

/** Member role update result */
export type MemberRoleUpdateResult = { userId: string; role: string } | null;
