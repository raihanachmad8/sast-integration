import { type NewFinding } from '@drizzle/schema/findings';
import { GITLEAKS_MATCH_PREVIEW_MAX_LENGTH } from '../constants';
import { normalizeFilePath } from './path-normalizer';
import type { ParseResult } from './index';

export interface GitleaksFinding {
  Description: string;
  StartLine: number;
  EndLine?: number;
  StartColumn?: number;
  Match: string;
  Secret?: string;
  File: string;
  RuleID: string;
  Tags?: string[];
  Severity?: string;
}

export interface GitleaksReport {
  results?: GitleaksFinding[];
}

/**
 * Gitleaks parser — converts Gitleaks JSON output into normalized findings.
 * 
 * Gitleaks is a secrets detection tool that scans for:
 * - API keys and tokens
 * - Passwords and credentials
 * - Private keys
 * - Connection strings
 * 
 * ## Output Format
 * ```json
 * {
 *   "results": [{
 *     "Description": "AWS Access Key",
 *     "StartLine": 42,
 *     "Match": "AKIAIOSFODNN7EXAMPLE",
 *     "File": "config.py",
 *     "RuleID": "aws-access-key",
 *     "Severity": "high"
 *   }]
 * }
 * ```
 * 
 * ## Severity Mapping
 * All secrets are classified as `high` severity by default, as leaked
 * credentials pose significant security risks regardless of the secret type.
 * 
 * ## Match Preview
 * The `description` field includes a truncated preview of the matched secret
 * (max 120 characters) to help developers identify the issue without
 * exposing the full secret in logs or UI.
 * 
 * @module scan/parsers/gitleaks
 * 
 * @example
 * ```ts
 * import { parseGitleaks } from './gitleaks.parser';
 * 
 * const result = parseGitleaks(jsonContent, scanId, 'gitleaks');
 * // result.findings: [{ rule: 'aws-access-key', severity: 'high', ... }]
 * ```
 */
export function parseGitleaks(
  jsonContent: string | Buffer,
  scanId: string,
  scanner: string = 'gitleaks'
): ParseResult {
  let report: GitleaksFinding[] | GitleaksReport;

  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    report = JSON.parse(text);
  } catch {
    return { findings: [], summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } };
  }

  const findings: NewFinding[] = [];
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  // Handle both formats:
  // 1. Flat array: [{...}, {...}]  (gitleaks --report-format json)
  // 2. Object with results: {results: [{...}]}  (legacy/converter format)
  let results: GitleaksFinding[];
  if (Array.isArray(report)) {
    results = report;
  } else {
    results = report.results ?? [];
  }

  for (const r of results) {
    const severity = mapGitleaksSeverity(r.Severity);
    severityCount[severity]++;

    findings.push({
      scanId: scanId,
      scanner,
      rule: r.RuleID,
      severity,
      filePath: normalizeFilePath(r.File),
      lineNumber: r.StartLine,
      message: `${r.Description || 'Secret detected'} at line ${r.StartLine}`,
      description: `Match: ${r.Match?.slice(0, GITLEAKS_MATCH_PREVIEW_MAX_LENGTH)}...`,
      codeSnippet: r.Match ?? null,
    });
  }

  return { findings, summary: severityCount };
}

function mapGitleaksSeverity(sev: string | undefined): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (!sev) return 'high';
  const s = sev.toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM' || s === 'WARNING') return 'medium';
  if (s === 'LOW' || s === 'INFO') return 'low';
  return 'high';
}
