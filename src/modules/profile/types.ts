/**
 * User profile data — editable user settings.
 *
 * @example
 * ```ts
 * const profile: Profile = {
 *   id: 'usr_01',
 *   email: 'alice@sast.dev',
 *   name: 'Alice Tan',
 *   avatarUrl: null,
 *   username: null,
 *   bio: null,
 *   timezone: 'Asia/Jakarta',
 *   language: 'en',
 *   emailVerifiedAt: '2026-01-10T08:00:00Z',
 *   createdAt: '2026-01-05T08:00:00Z',
 * };
 * ```
 */
export interface Profile {
  /** Unique user ID. */
  id: string;
  /** User email address. */
  email: string;
  /** User display name. */
  name: string;
  /** Optional avatar URL. */
  avatarUrl: string | null;
  /** Optional username. */
  username: string | null;
  /** Optional bio/description. */
  bio: string | null;
  /** Timezone identifier. */
  timezone: string | null;
  /** Preferred language locale. */
  language: string | null;
  /** ISO 8601 email verification timestamp. */
  emailVerifiedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}
