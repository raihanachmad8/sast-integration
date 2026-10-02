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
 * Parse Gitleaks JSON output.
 */
export function parseGitleaks(
  jsonContent: string | Buffer,
  scanId: string,
  scanner: string = 'gitleaks'
): { findings: NewFinding[]; summary: Record<string, number> } {
  let report: GitleaksReport;

  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    report = JSON.parse(text);
  } catch {
    return { findings: [], summary: {} };
  }

  const findings: NewFinding[] = [];
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const results = report.results ?? [];

  for (const r of results) {
    const severity = 'high'; // Secrets are usually high/critical
    severityCount[severity]++;

    findings.push({
      scan_id: scanId,
      scanner,
      rule: r.RuleID,
      severity,
      file_path: r.File,
      line_number: r.StartLine,
      message: r.Description || 'Secret detected',
      description: `Match: ${r.Match?.slice(0, GITLEAKS_MATCH_PREVIEW_MAX_LENGTH)}...`,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return { findings, summary: severityCount };
}
