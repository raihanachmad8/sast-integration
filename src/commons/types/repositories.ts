/**
 * Repository types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-repositories
 */

/**
 * Mock repository — mirrors the `repositories` table.
 *
 * @example
 * ```ts
 * const repo: RepositoryRow = {
 *   id: 'repo_01',
 *   projectId: 'proj_01',
 *   name: 'backend-api',
 *   url: 'https://gitlab.com/sast/backend-api',
 *   defaultBranch: 'main',
 *   autoScan: true,
 * };
 * ```
 */
export type RepositoryRow = {
  /** Unique repository ID. */
  id: string;
  /** Parent project ID. */
  projectId: string;
  /** Repository name. */
  name: string;
  /** Repository URL. */
  url: string;
  /** Default git branch. */
  defaultBranch: string;
  /** Whether auto-scan is enabled. */
  autoScan: boolean;
};

/**
 * Mock SCM provider connection — mirrors the `source_controls` table.
 *
 * @example
 * ```ts
 * const sc: SourceControl = {
 *   id: 'sc_01',
 *   workspaceId: 'ws_01',
 *   provider: 'github',
 *   name: 'GitHub Production',
 *   createdAt: '2026-01-10T08:00:00Z',
 * };
 * ```
 */
export type SourceControl = {
  /** Unique source control ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** SCM provider name (github, gitlab, etc.). */
  provider: string;
  /** Display name for the connection. */
  name: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock repository with source control and project info — extends RepositoryRow.
 *
 * @example
 * ```ts
 * const repo: RepositoryExtended = {
 *   id: 'repo_01',
 *   projectId: 'proj_01',
 *   name: 'backend-api',
 *   url: 'https://github.com/acme/backend-api',
 *   defaultBranch: 'main',
 *   autoScan: true,
 *   sourceControlId: 'sc_01',
 *   connectionType: 'scm',
 *   lastSyncedAt: '2026-06-04T05:00:00Z',
 *   projectName: 'Backend API',
 * };
 * ```
 */
export type RepositoryExtended = RepositoryRow & {
  /** Associated source control connection ID. */
  sourceControlId: string | null;
  /** Connection type — SCM (webhook) or external (CI upload). */
  connectionType: 'scm' | 'external';
  /** ISO 8601 timestamp of last sync. */
  lastSyncedAt: string | null;
  /** Parent project name. */
  projectName: string;
  /** SCM provider (github, gitlab, gitea). */
  provider: 'github' | 'gitlab' | 'gitea' | null;
};
