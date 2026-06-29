import type { ScmProvider } from '@/commons/types/domain';

/**
 * SCM provider connection configuration.
 *
 * @example
 * ```ts
 * const provider: ScmProviderConnection = {
 *   id: 'sc_01',
 *   name: 'GitHub Production',
 *   type: 'github',
 *   status: 'Connected',
 *   org: 'acme-corp',
 *   discovered: 24,
 *   imported: 12,
 *   lastSync: '2026-06-01T10:00:00Z',
 * };
 * ```
 */
export interface ScmProviderConnection {
  /** Unique provider connection ID. */
  id: string;
  /** Display name for the connection. */
  name: string;
  /** SCM provider type. */
  type: ScmProvider;
  /** Connection status. */
  status: 'Connected' | 'Disconnected' | 'Needs refresh';
  /** Authentication mode. */
  mode: string;
  /** Organization or group name. */
  org: string;
  /** Number of discovered repositories. */
  discovered: number;
  /** Number of imported repositories. */
  imported: number;
  /** ISO 8601 timestamp of last sync. */
  lastSync: string | null;
}

/**
 * Repository catalog entry from SCM provider.
 *
 * @example
 * ```ts
 * const repo: RepositoryCatalog = {
 *   id: '1',
 *   provider: 'GitHub',
 *   providerIcon: 'fa-brands fa-github',
 *   fullName: 'acme/backend-api',
 *   branch: 'main',
 *   visibility: 'private',
 *   imported: true,
 *   webhookStatus: 'active',
 *   project: 'Commerce Platform',
 * };
 * ```
 */
export interface RepositoryCatalog {
  /** Repository ID. */
  id: string;
  /** Provider display name. */
  provider: string;
  /** Provider icon class. */
  providerIcon: string;
  /** Full repository name (org/repo). */
  fullName: string;
  /** Default branch. */
  branch: string;
  /** Repository visibility. */
  visibility: string;
  /** Whether the repo is imported into SAST. */
  imported: boolean;
  /** Webhook status. */
  webhookStatus: 'active' | 'pending' | null;
  /** Associated project name. */
  project: string;
  /** Source control provider ID. */
  sourceControlId: string;
  /** Import record ID (for uninstall). */
  importId: string | null;
}
