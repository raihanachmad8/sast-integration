/**
 * Scan types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-scans
 */

/**
 * Mock scan — mirrors the `scans` table.
 *
 * @example
 * ```ts
 * const scan: Scan = {
 *   id: 'scan_01',
 *   repositoryId: 'repo_01',
 *   status: 'completed',
 *   branch: 'main',
 *   commitSha: 'a1b2c3d4',
 *   startedAt: '2026-06-04T06:00:00Z',
 *   completedAt: '2026-06-04T06:12:00Z',
 *   createdAt: '2026-06-04T06:00:00Z',
 * };
 * ```
 */
export type Scan = {
  /** Unique scan ID. */
  id: string;
  /** Repository ID being scanned. */
  repositoryId: string;
  /** Scan status. */
  status: string;
  /** Git branch scanned. */
  branch: string;
  /** Git commit SHA. */
  commitSha: string;
  /** ISO 8601 start timestamp. */
  startedAt: string | null;
  /** ISO 8601 completion timestamp. */
  completedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock scan with repository/project names and findings counts — extends Scan.
 *
 * @example
 * ```ts
 * const scan: ScanExtended = {
 *   id: 'scan_01',
 *   repositoryId: 'repo_01',
 *   status: 'completed',
 *   branch: 'main',
 *   commitSha: 'a1b2c3d4',
 *   startedAt: '2026-06-04T06:00:00Z',
 *   completedAt: '2026-06-04T06:12:00Z',
 *   createdAt: '2026-06-04T06:00:00Z',
 *   repositoryName: 'backend-api',
 *   projectName: 'Backend API',
 *   origin: 'managed',
 *   triggerSource: 'manual',
 *   profileName: 'Standard SAST',
 *   findingsCount: 6,
 *   criticalCount: 2,
 * };
 * ```
 */
export type ScanExtended = Scan & {
  /** Repository name. */
  repositoryName: string;
  /** Project name. */
  projectName: string;
  /** Scan origin — managed (triggered by SAST) or external_upload. */
  origin: 'managed' | 'external_upload';
  /** What triggered the scan. */
  triggerSource: 'manual' | 'schedule' | 'webhook' | 'ci' | null;
  /** Scan profile name used. */
  profileName: string | null;
  /** Total findings in the scan. */
  findingsCount: number;
  /** Critical severity findings count. */
  criticalCount: number;
};

/**
 * Mock scan result — per-scanner output for a scan.
 *
 * @example
 * ```ts
 * const result: ScanResult = {
 *   id: 'sr_01',
 *   scanId: 'scan_01',
 *   scanner: 'semgrep',
 *   format: 'json',
 *   parsedSummary: { critical: 4, high: 1, medium: 2 },
 *   createdAt: '2026-06-04T06:12:00Z',
 * };
 * ```
 */
export type ScanResult = {
  /** Unique scan result ID. */
  id: string;
  /** Parent scan ID. */
  scanId: string;
  /** Scanner engine name. */
  scanner: string;
  /** Output format (json, sarif, etc.). */
  format: string | null;
  /** Parsed severity breakdown. */
  parsedSummary: Record<string, unknown> | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock scan profile — predefined scanner configuration.
 *
 * @example
 * ```ts
 * const profile: ScanProfile = {
 *   id: 'sp_01',
 *   workspaceId: 'ws_01',
 *   name: 'Standard SAST',
 *   profile: 'standard',
 *   scanners: ['semgrep', 'gitleaks'],
 *   aiVerification: 'enabled',
 *   severityThreshold: 'medium',
 *   timeoutSeconds: 300,
 *   maxFindings: 2000,
 *   createdAt: '2026-01-15T08:00:00Z',
 * };
 * ```
 */
export type ScanProfile = {
  /** Unique scan profile ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Profile display name. */
  name: string;
  /** Profile identifier (quick, standard, comprehensive). */
  profile: string;
  /** List of scanner engines to run. */
  scanners: string[];
  /** AI verification setting (enabled/disabled). */
  aiVerification: string;
  /** Minimum severity to report. */
  severityThreshold: string;
  /** Scan timeout in seconds. */
  timeoutSeconds: number;
  /** Maximum findings to capture. */
  maxFindings: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Whether this is the default (built-in) profile. */
  isDefault?: boolean;
};

/**
 * Mock scan upload — CI/CD pipeline scan file import.
 *
 * @example
 * ```ts
 * const upload: ScanUpload = {
 *   id: 'su_01',
 *   repositoryId: 'repo_01',
 *   projectId: 'proj_01',
 *   scanId: 'scan_01',
 *   branch: 'main',
 *   commitSha: 'a1b2c3d4',
 *   source: 'github-actions',
 *   createdAt: '2026-06-04T06:00:00Z',
 * };
 * ```
 */
export type ScanUpload = {
  /** Unique upload ID. */
  id: string;
  /** Repository ID (null if project-level upload). */
  repositoryId: string | null;
  /** Project ID. */
  projectId: string | null;
  /** Scan ID created from upload. */
  scanId: string | null;
  /** Git branch. */
  branch: string | null;
  /** Git commit SHA. */
  commitSha: string | null;
  /** Upload source identifier (e.g. 'github-actions', 'cli'). */
  source: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};
