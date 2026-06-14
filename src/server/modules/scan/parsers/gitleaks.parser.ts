import { type NewFinding } from '@drizzle/schema/findings';
import { GITLEAKS_MATCH_PREVIEW_MAX_LENGTH } from '../constants';

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
): { findings: NewFinding[]; summary: Record<string, number> } {
  let report: GitleaksFinding[] | GitleaksReport;

  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    report = JSON.parse(text);
  } catch {
    return { findings: [], summary: {} };
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
    const severity = 'high'; // Secrets are usually high/critical
    severityCount[severity]++;

    findings.push({
      scanId: scanId,
      scanner,
      rule: r.RuleID,
      severity,
      filePath: r.File,
      lineNumber: r.StartLine,
      message: r.Description || 'Secret detected',
      description: `Match: ${r.Match?.slice(0, GITLEAKS_MATCH_PREVIEW_MAX_LENGTH)}...`,
      codeSnippet: r.Match ?? null,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { findings, summary: severityCount };
}
