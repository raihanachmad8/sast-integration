/**
 * Knowledge base types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-knowledge
 */

/**
 * Mock knowledge source — external CVE/NVD feed or custom rules.
 *
 * @example
 * ```ts
 * const source: KnowledgeSource = {
 *   id: 'ks_01',
 *   workspaceId: 'ws_01',
 *   name: 'NVD Feed',
 *   type: 'nvd',
 *   url: 'https://nvd.nist.gov/feeds/json/cve/2.0',
 *   status: 'connected',
 *   entryCount: 15420,
 *   lastSyncedAt: '2026-06-04T00:00:00Z',
 *   createdAt: '2026-01-15T08:00:00Z',
 * };
 * ```
 */
export type KnowledgeSource = {
  /** Unique knowledge source ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Source display name. */
  name: string;
  /** Source type (nvd, manual, mitre). */
  type: string;
  /** Source URL for sync. */
  url: string | null;
  /** Connection status. */
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  /** Number of entries imported from this source. */
  entryCount: number;
  /** ISO 8601 last sync timestamp. */
  lastSyncedAt: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock knowledge entry — CWE/CVE record for AI context.
 *
 * @example
 * ```ts
 * const entry: KnowledgeEntryRow = {
 *   id: 'ke_01',
 *   sourceId: 'ks_01',
 *   cweId: 'CWE-89',
 *   title: 'SQL Injection',
 *   severity: 'critical',
 *   remediation: 'Use parameterized queries',
 *   muted: false,
 *   usedByAiCount: 42,
 *   createdAt: '2026-01-15T08:00:00Z',
 * };
 * ```
 */
export type KnowledgeEntryRow = {
  /** Unique entry ID. */
  id: string;
  /** Knowledge source ID. */
  sourceId: string;
  /** Knowledge source display name. */
  sourceName?: string;
  /** Knowledge source type. */
  sourceType?: string;
  /** CWE identifier. */
  cweId: string | null;
  /** Entry title. */
  title: string;
  /** Severity level. */
  severity: string | null;
  /** Remediation guidance. */
  remediation: string | null;
  /** Entry content used by AI verification. */
  content?: string | null;
  /** Search and categorization tags. */
  tags?: string[];
  /** Whether entry is muted from AI queries. */
  muted: boolean;
  /** Times used by AI verification. */
  usedByAiCount: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock knowledge backfill job — batch import from a knowledge source.
 *
 * @example
 * ```ts
 * const job: KnowledgeBackfillJob = {
 *   id: 'kbj_01',
 *   sourceId: 'ks_01',
 *   sourceType: 'nvd',
 *   status: 'completed',
 *   rangeStart: '2024-01-01T00:00:00Z',
 *   rangeEnd: '2024-12-31T00:00:00Z',
 *   importedCount: 15420,
 *   createdAt: '2026-01-15T08:00:00Z',
 * };
 * ```
 */
export type KnowledgeBackfillJob = {
  /** Unique job ID. */
  id: string;
  /** Knowledge source ID. */
  sourceId: string | null;
  /** Workspace ID. */
  workspaceId?: string | null;
  /** Source type (nvd, manual, mitre). */
  sourceType: string;
  /** Job status. */
  status: 'queued' | 'running' | 'completed' | 'failed';
  /** ISO 8601 start of date range. */
  rangeStart: string;
  /** ISO 8601 end of date range. */
  rangeEnd: string;
  /** ISO 8601 cursor for the next window. */
  cursorStart?: string;
  /** Window size in days. */
  windowDays?: number;
  /** Number of entries imported. */
  importedCount: number;
  /** Last recorded error. */
  lastError?: string | null;
  /** ISO 8601 timestamp when processing started. */
  startedAt?: string | null;
  /** ISO 8601 completion timestamp. */
  completedAt?: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Backfill progress percentage (0-100), or -1 if unknown. */
  progress?: number;
};
