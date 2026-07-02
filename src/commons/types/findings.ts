/**
 * Finding types — mirror the Drizzle schema for frontend development.
 *
 * @module commons-types-findings
 */

import type { Finding } from './domain';

/**
 * Mock finding — mirrors the `findings` table.
 *
 * @example
 * ```ts
 * const finding: FindingRow = {
 *   id: 'f_01',
 *   scanId: 'scan_01',
 *   severity: 'critical',
 *   status: 'open',
 *   filePath: 'src/routes/orders.ts',
 *   lineNumber: 88,
 *   rule: 'sql-injection',
 *   scanner: 'semgrep',
 *   message: 'Potential SQL injection in query builder',
 *   createdAt: '2026-06-04T06:05:00Z',
 * };
 * ```
 */
export type FindingRow = {
  /** Unique finding ID. */
  id: string;
  /** Parent scan ID. */
  scanId: string;
  /** Severity level. */
  severity: string;
  /** Triage status. */
  status: string;
  /** Source file path. */
  filePath: string;
  /** Line number in source. */
  lineNumber: number;
  /** Scanner rule name. */
  rule: string;
  /** Scanner engine name. */
  scanner: string;
  /** Finding message. */
  message: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
};

/**
 * Mock finding with repository/project/AI info — extends FindingRow.
 *
 * @example
 * ```ts
 * const finding: FindingExtended = {
 *   id: 'f_01',
 *   scanId: 'scan_01',
 *   severity: 'critical',
 *   status: 'open',
 *   filePath: 'src/routes/orders.ts',
 *   lineNumber: 88,
 *   rule: 'sql-injection',
 *   scanner: 'semgrep',
 *   message: 'Potential SQL injection',
 *   createdAt: '2026-06-04T06:05:00Z',
 *   repositoryName: 'backend-api',
 *   projectName: 'Backend API',
 *   cweId: 'CWE-89',
 *   description: 'Potential SQL injection in query builder',
 *   codeSnippet: null,
 *   assignedTo: 'usr_02',
 *   assignedToName: 'Bob Chen',
 *   verdict: 'TP',
 *   model: 'Qwen 2.5 72B',
 *   confidence: 92,
 * };
 * ```
 */
export type FindingExtended = FindingRow & {
  /** Repository name. */
  repositoryName: string;
  /** Project name. */
  projectName: string;
  /** CWE identifier. */
  cweId: string | null;
  /** Finding description. */
  description: string | null;
  /** Code snippet around the finding. */
  codeSnippet: string | null;
  /** Assigned user ID. */
  assignedTo: string | null;
  /** Assigned user display name. */
  assignedToName: string | null;
  /** AI verification verdict (for display). */
  verdict: 'TP' | 'FP' | 'Pending' | null;
  /** AI model name used for verification. */
  model: string;
  /** AI confidence score (0–100). */
  confidence: number | null;
  /** AI explanation / reasoning. */
  explanation: string | null;
  /** Data flow path from source to sink. */
  dataFlow: string | null;
  /** Taint source description. */
  taintSource: string | null;
  /** What the scanner found and why it flagged this. */
  matchDetail: string | null;
  /** Likely CWE identifiers predicted by AI. */
  likelyCwe: string[] | null;
  /** AI-suggested fix. */
  fixSuggestion: string | null;
};

/**
 * Mock finding group — deduplicated finding across scans.
 *
 * @example
 * ```ts
 * const group: FindingGroup = {
 *   id: 'fg_01',
 *   projectId: 'proj_01',
 *   fingerprint: 'a1b2c3d4e5f6',
 *   title: 'SQL Injection in query builder',
 *   firstSeenAt: '2026-06-04T06:05:00Z',
 *   lastSeenAt: '2026-06-04T06:05:00Z',
 *   findingCount: 3,
 * };
 * ```
 */
export type FindingGroup = {
  /** Unique finding group ID. */
  id: string;
  /** Parent project ID. */
  projectId: string;
  /** Fingerprint hash for deduplication. */
  fingerprint: string;
  /** Group title. */
  title: string | null;
  /** ISO 8601 first occurrence timestamp. */
  firstSeenAt: string;
  /** ISO 8601 last occurrence timestamp. */
  lastSeenAt: string;
  /** Number of findings in this group. */
  findingCount: number;
};

/**
 * AI model response — parsed output from LLM verification.
 * Used as return type for callAiModel and parseAiResponse.
 */
export type AiModelResponse = {
  /** Verdict: true_positive or false_positive. */
  verdict: string;
  /** Confidence score (0–1). */
  confidence: number;
  /** Detailed explanation of the verdict. */
  explanation: string;
  /** How tainted data flows from source to sink. */
  dataFlow?: string;
  /** Untrusted input origin. */
  taintSource?: string;
  /** What the scanner found and why it flagged this. */
  matchDetail?: string;
  /** Likely CWE identifiers. */
  likelyCwe?: string[];
  /** Suggested code fix if true positive. */
  fixSuggestion?: string;
  /** Raw AI response text for debugging. */
  rawResponse?: string;
};

/**
 * Normalize raw API finding fields to the frontend `Finding` display shape.
 *
 * The server returns `repositoryName`, `cweId`, `assignedTo`, `filePath`.
 * The `Finding` type expects `repo`, `cwe`, `assignee`, `file`.
 *
 * Centralized here so all consumers (list, detail page, drawer) share
 * a single source of truth for field mapping.
 *
 * @param raw - Raw finding from API response
 * @returns Normalized finding with short field names
 */
export function normalizeFinding(raw: Record<string, unknown>): Finding {
  return {
    id: raw.id as string,
    scanId: raw.scanId as string,
    groupId: raw.groupId as string,
    projectId: (raw.projectId as string) ?? undefined,
    rule: (raw.rule as string) ?? '',
    repo: (raw.repositoryName as string) ?? (raw.repo as string) ?? '',
    file: (raw.filePath as string) ?? (raw.file as string) ?? '',
    filePath: (raw.filePath as string) ?? undefined,
    severity: (raw.severity as Finding['severity']) ?? 'low',
    scanner: (raw.scanner as string) ?? '',
    verdict: ((raw.verdict as string) ?? 'Pending') as Finding['verdict'],
    confidence: (raw.confidence as number) ?? null,
    model: (raw.model as string) ?? '',
    assignee: (raw.assignedTo as string | null) ?? (raw.assignee as string | null) ?? null,
    status: ((raw.groupStatus as string) ?? (raw.status as string) ?? 'open') as Finding['status'],
    cwe: (raw.cweId as string) ?? (raw.cwe as string) ?? '',
    lineNumber: (raw.lineNumber as number) ?? undefined,
    message: (raw.message as string) ?? undefined,
    codeSnippet: (raw.codeSnippet as string) ?? undefined,
    explanation: (raw.explanation as string) ?? undefined,
    fixSuggestion: (raw.fixSuggestion as string) ?? undefined,
    matchDetail: (raw.matchDetail as string) ?? undefined,
    likelyCwe: (raw.likelyCwe as string[]) ?? undefined,
    dataFlow: (raw.dataFlow as string) ?? undefined,
    taintSource: (raw.taintSource as string) ?? undefined,
  } as Finding;
}
