import { type NewFinding } from '@drizzle/schema/findings';

export interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number; col?: number };
  end?: { line: number; col?: number };
  extra: {
    message: string;
    severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
    metadata?: {
      cwe?: string | string[];
      category?: string;
      technology?: string[];
      confidence?: string;
    };
    lines?: string;
  };
}

export interface SemgrepReport {
  results?: SemgrepResult[];
  errors?: unknown[];
  paths?: unknown;
  version?: string;
}

/**
 * Parse Semgrep JSON output into normalized findings.
 */
export function parseSemgrep(
  jsonContent: string | Buffer,
  scanId: string,
  scanner: string = 'semgrep'
): { findings: NewFinding[]; summary: Record<string, number> } {
  let report: SemgrepReport;

  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    report = JSON.parse(text);
  } catch {
    throw new Error('Invalid Semgrep JSON report');
  }

  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const results = report.results ?? [];

  for (const r of results) {
    const severity = mapSemgrepSeverity(r.extra?.severity);

    if (severity in severityCount) {
      severityCount[severity as keyof typeof severityCount]++;
    }

    const cwe = extractCwe(r.extra?.metadata?.cwe);

    const finding: NewFinding = {
      scan_id: scanId,
      scanner,
      rule: r.check_id,
      severity,
      file_path: r.path,
      line_number: r.start?.line ?? null,
      message: r.extra?.message ?? '',
      description: r.extra?.message ?? '',
      code_snippet: r.extra?.lines ?? null,
      cwe_id: cwe,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    };

    findings.push(finding);
  }

  return { findings, summary: severityCount };
}

function mapSemgrepSeverity(sev: string | undefined): string {
  if (!sev) return 'medium';
  const s = sev.toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH' || s === 'ERROR') return 'high';
  if (s === 'MEDIUM' || s === 'WARNING') return 'medium';
  if (s === 'LOW' || s === 'INFO') return 'low';
  return 'medium';
}

function extractCwe(cwe?: string | string[]): string | null {
  if (!cwe) return null;
  if (Array.isArray(cwe)) {
    return cwe[0] ?? null;
  }
  return cwe;
}
