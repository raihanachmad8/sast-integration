/**
 * Report types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-reports
 */

/**
 * Mock report — generated security summary or scan report.
 *
 * @example
 * ```ts
 * const report: ReportRow = {
 *   id: 'rpt_01',
 *   workspaceId: 'ws_01',
 *   type: 'security_summary',
 *   title: 'Monthly Security Summary — June 2026',
 *   format: 'pdf',
 *   filePath: '/reports/june-2026.pdf',
 *   fileSize: 245760,
 *   createdAt: '2026-06-01T08:00:00Z',
 *   createdBy: 'usr_01',
 *   createdByName: 'Alice Tan',
 * };
 * ```
 */
export type ReportRow = {
  /** Unique report ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Report type (security_summary, scan_detail, etc.). */
  type: string;
  /** Report title. */
  title: string;
  /** Report status (generated, pending, failed). */
  status?: string;
  /** Output format (pdf, json, csv). */
  format: string | null;
  /** Report filters (range, severity, etc.). */
  filters?: unknown;
  /** File path for download. */
  filePath: string | null;
  /** File size in bytes. */
  fileSize: number | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** User ID who generated the report. */
  createdBy: string;
  /** Display name of report generator. */
  createdByName: string;
};

/**
 * Mock quality gate — scan pass/fail policy thresholds.
 *
 * @example
 * ```ts
 * const gate: QualityGate = {
 *   id: 'qg_01',
 *   workspaceId: 'ws_01',
 *   threshold: 'high',
 *   failOnCritical: true,
 *   failOnHighTp: true,
 *   warnOnPending: true,
 *   requireHumanAck: false,
 *   pendingBehavior: 'warn',
 *   createdAt: '2026-01-10T08:00:00Z',
 * };
 * ```
 */
export type QualityGate = {
  /** Unique quality gate ID. */
  id: string;
  /** Workspace ID. */
  workspaceId: string;
  /** Severity threshold (info, low, medium, high, critical). */
  threshold: string;
  /** Fail scan if critical findings exist. */
  failOnCritical: boolean;
  /** Fail scan if high-severity true positives exist. */
  failOnHighTp: boolean;
  /** Fail scan if high-severity findings exist. */
  failOnHigh: boolean;
  /** Fail scan if medium-severity findings exist. */
  failOnMedium: boolean;
  /** Fail scan if low-severity findings exist. */
  failOnLow: boolean;
  /** Fail scan if new findings are pending review. */
  failOnPending: boolean;
  /** Fail scan if AI verified as true positive. */
  failOnTp: boolean;
  /** Warn if findings are still pending AI verification. */
  warnOnPending: boolean;
  /** Require human acknowledgment before passing. */
  requireHumanAck: boolean;
  /** Behavior for pending findings (warn, block, ignore). */
  pendingBehavior: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock quality gate evaluation result for a scan.
 *
 * @example
 * ```ts
 * const result: QualityGateResult = {
 *   id: 'qgr_01',
 *   scanId: 'scan_01',
 *   gateId: 'qg_01',
 *   status: 'pass',
 *   blockingFindings: 0,
 *   pendingFindings: 2,
 *   evaluatedAt: '2026-06-04T06:12:00Z',
 * };
 * ```
 */
export type QualityGateResult = {
  /** Unique result ID. */
  id: string;
  /** Scan ID evaluated. */
  scanId: string;
  /** Quality gate config ID used. */
  gateId: string;
  /** Evaluation outcome. */
  status: 'pass' | 'fail' | 'warn';
  /** Number of findings blocking the gate. */
  blockingFindings: number;
  /** Number of findings still pending verification. */
  pendingFindings: number;
  /** ISO 8601 evaluation timestamp. */
  evaluatedAt: string;
};
