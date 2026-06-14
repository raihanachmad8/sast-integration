import type { ScanStatus, Severity } from '@/commons/types/domain';

/**
 * Payload for triggering a new scan.
 *
 * @example
 * ```ts
 * const payload: TriggerScanPayload = {
 *   repositoryId: 'repo_01',
 *   branch: 'main',
 *   profile: 'standard',
 *   scanners: ['semgrep', 'gitleaks'],
 * };
 * ```
 */
export interface TriggerScanPayload {
  /** Repository ID to scan. */
  repositoryId: string;
  /** Branch to scan. */
  branch: string;
  /** List of scanner names to run. */
  scanners: string[];
}

/**
 * Filter state for the scan list view.
 *
 * @example
 * ```ts
 * const filters: ScanFilters = {
 *   status: ['completed', 'running'],
 *   scanner: ['semgrep'],
 *   search: 'backend-api',
 * };
 * ```
 */
export interface ScanFilters {
  /** Filter by scan status. Empty array means no filter. */
  status: ScanStatus[];
  /** Filter by scanner name. Empty array means no filter. */
  scanner: string[];
  /** Free-text search across repository and branch. */
  search: string;
}

/**
 * Scan detail with rich timeline and AI verification stats.
 * Extends the base ScanRow from domain types.
 *
 * @example
 * ```ts
 * const detail: ScanDetailData = {
 *   id: 'scan-100',
 *   repository: 'backend-api',
 *   branch: 'main',
 *   status: 'completed',
 *   findings: 15,
 *   critical: 2,
 *   ai: '12/15',
 *   timeline: [...],
 *   scannerResults: [...],
 * };
 * ```
 */
export interface ScanDetailData {
  /** Unique scan identifier. */
  id: string;
  /** Repository name. */
  repository: string;
  /** Branch name. */
  branch: string;
  /** Git commit SHA. */
  commitSha: string;
  /** Scan origin type. */
  origin: 'managed' | 'external_upload';
  /** Scan status. */
  status: 'queued' | 'processing' | 'completed' | 'failed';
  /** ISO 8601 timestamp when scan started. */
  startedAt: string;
  /** ISO 8601 timestamp when scan completed. */
  completedAt?: string;
  /** Total duration in seconds. */
  durationSeconds?: number;
  /** Per-scanner results. */
  scannerResults: Array<{
    scanner: string;
    status: 'completed' | 'failed' | 'skipped';
    findingsCount: number;
    durationSeconds?: number;
    error?: string;
  }>;
  /** Total findings count. */
  totalFindings: number;
  /** Breakdown by severity. */
  severityBreakdown: Record<Severity, number>;
  /** AI verification statistics. */
  aiStats?: {
    enabled: boolean;
    verified: number;
    total: number;
    truePositives: number;
    falsePositives: number;
    pending: number;
  };
  /** Scan execution timeline. */
  timeline: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    durationSeconds?: number;
    metadata?: Record<string, string | number>;
  }>;
}
