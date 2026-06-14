/**
 * Dashboard summary statistics for the workspace overview.
 *
 * @example
 * ```ts
 * const stats: DashboardStats = {
 *   connectedRepos: 3,
 *   activeScans: 1,
 *   criticalFindings: 4,
 *   awaitingAi: 6,
 * };
 * ```
 */
export interface DashboardStats {
  /** Number of connected repositories. */
  connectedRepos: number;
  /** Number of currently running scans. */
  activeScans: number;
  /** Number of critical severity findings. */
  criticalFindings: number;
  /** Number of findings awaiting AI verification. */
  awaitingAi: number;
}

/**
 * A single scan row for the recent scans table on the dashboard.
 *
 * @example
 * ```ts
 * const scan: DashboardScan = {
 *   id: '1',
 *   repository: 'backend-api',
 *   branch: 'main',
 *   status: 'Running',
 *   stage: 'AI verification',
 *   findings: 28,
 *   critical: 4,
 *   ai: '22/28',
 *   time: '12 min ago',
 * };
 * ```
 */
export interface DashboardScan {
  /** Unique scan identifier. */
  id: string;
  /** Repository name. */
  repository: string;
  /** Branch name. */
  branch: string;
  /** Scan status (Running, Completed, Failed). */
  status: string;
  /** Current scan stage. */
  stage: string;
  /** Total findings count. */
  findings: number;
  /** Critical findings count. */
  critical: number;
  /** AI verification progress (e.g., "22/28"). */
  ai: string;
  /** Relative time string (e.g., "12 min ago"). */
  time: string;
}

/**
 * A critical finding for the attention panel on the dashboard.
 *
 * @example
 * ```ts
 * const finding: DashboardFinding = {
 *   id: '1',
 *   rule: 'SQL Injection',
 *   file: 'src/routes/orders.ts:88',
 *   verdict: 'TP',
 * };
 * ```
 */
export interface DashboardFinding {
  /** Unique finding identifier. */
  id: string;
  /** Rule name that triggered the finding. */
  rule: string;
  /** File path and line number. */
  file: string;
  /** Verdict status (TP, Pending, FP). */
  verdict: string;
}

/**
 * Workspace health status — raw counts returned by the server.
 * UI maps these to presentation (colors, labels, variants).
 *
 * @example
 * ```ts
 * const health: DashboardHealth = { scanners: 3, sources: 2, models: 1 };
 * ```
 */
export interface DashboardHealth {
  /** Number of configured scan profiles. */
  scanners: number;
  /** Number of connected source repositories. */
  sources: number;
  /** Number of available AI models. */
  models: number;
}
