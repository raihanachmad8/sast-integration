/**
 * Team types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-teams
 */

/**
 * Mock team — mirrors the `teams` table.
 *
 * @example
 * ```ts
 * const team: TeamRow = {
 *   id: 'tm_01',
 *   workspaceId: 'ws_01',
 *   name: 'Security Core',
 *   slug: 'security-core',
 *   description: 'Core security scanning team.',
 *   createdAt: '2026-01-20T08:00:00Z',
 * };
 * ```
 */
export type TeamRow = {
  /** Unique team ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Team display name. */
  name: string;
  /** URL-friendly team slug. */
  slug: string;
  /** Optional team description. */
  description: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock team member — mirrors the `team_members` table.
 *
 * @example
 * ```ts
 * const member: TeamMemberRow = {
 *   id: 'tmbr_01',
 *   teamId: 'tm_01',
 *   userId: 'usr_01',
 *   role: 'admin',
 *   joinedAt: '2026-01-20T08:00:00Z',
 * };
 * ```
 */
export type TeamMemberRow = {
  /** Unique membership ID. */
  id: string;
  /** Team ID. */
  teamId: string;
  /** User ID. */
  userId: string;
  /** Role in the team. */
  role: 'admin' | 'contributor';
  /** ISO 8601 join timestamp. */
  joinedAt: string;
};
