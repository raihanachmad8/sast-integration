/**
 * Project types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-projects
 */

/**
 * Mock project — mirrors the `projects` table.
 *
 * @example
 * ```ts
 * const project: ProjectRow = {
 *   id: 'proj_01',
 *   workspaceId: 'ws_01',
 *   name: 'Backend API',
 *   slug: 'backend-api',
 *   platform: 'node',
 *   language: 'typescript',
 *   description: 'Main backend REST API service.',
 *   createdAt: '2026-01-25T08:00:00Z',
 * };
 * ```
 */
export type ProjectRow = {
  /** Unique project ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Project display name. */
  name: string;
  /** URL-friendly project slug. */
  slug: string;
  /** Platform type (node, web, mobile, etc.). */
  platform: string | null;
  /** Primary programming language. */
  language: string | null;
  /** Optional project description. */
  description: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock project member — mirrors the `project_members` table.
 *
 * @example
 * ```ts
 * const pm: ProjectMember = {
 *   id: 'pm_01',
 *   projectId: 'proj_01',
 *   userId: 'usr_01',
 *   role: 'owner',
 *   joinedAt: '2026-01-25T08:00:00Z',
 * };
 * ```
 */
export type ProjectMember = {
  /** Unique membership ID. */
  id: string;
  /** Project ID. */
  projectId: string;
  /** User ID. */
  userId: string;
  /** Role in the project. */
  role: string;
  /** ISO 8601 join timestamp. */
  joinedAt: string;
};

/**
 * Mock project team — mirrors the `project_teams` table.
 *
 * @example
 * ```ts
 * const pt: ProjectTeam = {
 *   id: 'pt_01',
 *   projectId: 'proj_01',
 *   teamId: 'tm_01',
 *   role: 'contributor',
 *   addedAt: '2026-01-26T08:00:00Z',
 * };
 * ```
 */
export type ProjectTeam = {
  /** Unique association ID. */
  id: string;
  /** Project ID. */
  projectId: string;
  /** Team ID. */
  teamId: string;
  /** Role of the team in the project. */
  role: string;
  /** ISO 8601 timestamp when added. */
  addedAt: string;
};

/**
 * Mock project API token — CI/CD authentication for scan uploads.
 *
 * @example
 * ```ts
 * const token: ProjectApiToken = {
 *   id: 'pat_01',
 *   projectId: 'proj_01',
 *   name: 'CI Pipeline',
 *   tokenPrefix: 'sast_p_a1b2..',
 *   permissions: ['scans:upload'],
 *   lastUsedAt: '2026-06-04T06:00:00Z',
 *   createdAt: '2026-03-01T08:00:00Z',
 *   expiresAt: '2026-12-01T08:00:00Z',
 *   revokedAt: null,
 * };
 * ```
 */
export type ProjectApiToken = {
  /** Unique token ID. */
  id: string;
  /** Parent project ID. */
  projectId: string;
  /** Token display name. */
  name: string;
  /** Token prefix for identification (first 12 chars). */
  tokenPrefix: string;
  /** Granted permissions. */
  permissions: string[];
  /** ISO 8601 last usage timestamp. */
  lastUsedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 expiry timestamp. */
  expiresAt: string | null;
  /** ISO 8601 revocation timestamp. */
  revokedAt: string | null;
};
