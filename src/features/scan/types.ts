/**
 * Scan-specific types not in `@/commons/types`.
 *
 * @module scan-component-types
 *
 * @remarks
 * Shared types (`ScanRow`, `ScanDetail`, `Finding`, `TimelineEvent`, etc.)
 * are imported from `@/commons/types`. This file only contains types
 * unique to the scan feature components (e.g., `AiRichAnalysis`, scan-specific `Finding`).
 */

import type {
  ScmProvider,
  RepositoryConnectionType,
  ScanOrigin,
  ScanRow,
  ScanDetail,
  ScannerResult,
  TimelineEvent,
  TimelineEventType,
  ScanConfig,
  ScanRepository,
} from '@/commons/types';

// Re-export shared types so existing component imports still work
export type {
  ScmProvider,
  RepositoryConnectionType,
  ScanOrigin,
  ScanRow,
  ScanDetail,
  ScannerResult,
  TimelineEvent,
  TimelineEventType,
  ScanConfig,
  ScanRepository,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Scan-specific types (NOT in @/commons/types)
// ═══════════════════════════════════════════════════════════════════════════════

/** AI verification verdict types (DB-level values stored in ai_verifications.verdict). */
export type AiVerdictDb = 'true_positive' | 'false_positive' | 'pending' | 'verified' | 'error';

/**
 * Rich AI analysis result from QLoRA fine-tuned model.
 * Matches the structure from viewer/index.html and db.json.
 *
 * @remarks
 * This type is scan-specific because it contains detailed AI model output
 * (dataFlow, taintSource, matchDetail, raw) that is not needed by the
 * simplified findings list view.
 */
export interface AiRichAnalysis {
  /** AI verdict. */
  verdict: 'true_positive' | 'false_positive' | 'error';
  /** Confidence score (0-1 or 0-100). */
  confidence: number;
  /** Explanation of the verdict. */
  explanation: string;
  /** Data flow analysis (source to sink). */
  dataFlow: string;
  /** Taint source identification. */
  taintSource: string;
  /** Detail of the match. */
  matchDetail: string;
  /** Likely CWE identifiers. */
  likelyCwe: string[];
  /** Fix/remediation suggestion. */
  fixSuggestion: string;
  /** Model name used for analysis. */
  model: string;
  /** Raw model output (for debugging). */
  raw: string;
}

/**
 * Individual scan finding data (scan-specific version).
 *
 * @remarks
 * This type differs from the unified `Finding` in `@/commons/types`:
 * - Uses `filePath` instead of `file`
 * - Has `lineNumber` as required
 * - Has `message` as required
 * - Has `aiVerdict` (scan-specific verdict string) instead of simple `verdict`
 * - Has `groundTruth` for evaluation labels
 * - Has `aiAnalysis` keyed by model name (rich analysis)
 *
 * The unified `Finding` type is used by the findings list page.
 * This scan-specific type is used by scan detail components.
 */
export interface Finding {
  /** Unique finding identifier. */
  id: string;
  /** Scanner that detected this finding. */
  scanner: string;
  /** Rule identifier from the scanner. */
  rule: string;
  /** Severity level. */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'WARNING' | 'ERROR';
  /** File path where the finding was detected. */
  filePath?: string;
  /** Line number in the file. */
  lineNumber?: number;
  /** Description of the finding. */
  message?: string;
  /** CWE identifier (e.g., "CWE-120: Buffer Overflow"). */
  cwe?: string;
  /** Ground truth label (for evaluation). */
  groundTruth?: 'true_positive' | 'false_positive';
  /** Current status. */
  status: 'open' | 'verified' | 'fixed' | 'false_positive' | 'ignored';
  /** AI verification result (simple verdict). */
  aiVerdict?: AiVerdictDb;
  /** AI confidence score (0-100). */
  confidence?: number;
  /** Source code snippet around the finding. */
  codeSnippet?: string;
  /** Full source file content (for code viewer). */
  sourceCode?: string;
  /** CWE identifiers array. */
  cweIds?: string[];
  /** Data flow analysis (source to sink). */
  dataFlow?: string;
  /** Taint source identification. */
  taintSource?: string;
  /** Rich AI analysis results keyed by model name. */
  aiAnalysis?: Record<string, AiRichAnalysis>;
}
