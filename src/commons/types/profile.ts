/**
 * Profile module types — shared between frontend and backend.
 *
 * @module commons-types-profile
 */

/** Profile view — profile page */
export interface ProfileView {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  username: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}

/** Session view — security tab */
export interface SessionView {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivity: string;
  createdAt: string;
}
