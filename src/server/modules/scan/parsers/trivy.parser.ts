import { type NewFinding } from '@drizzle/schema/findings';

interface TrivyResult {
  Target: string;
  Class?: string;
  Type?: string;
  Vulnerabilities?: Array<{
    VulnerabilityID: string;
    PkgName?: string;
    InstalledVersion?: string;
    Severity: string;
    Title?: string;
    Description?: string;
  }>;
  Misconfigurations?: Array<{
    ID: string;
    Title: string;
    Severity: string;
    Message: string;
  }>;
  Secrets?: Array<{
    RuleID: string;
    Severity: string;
    Title: string;
    Match: string;
  }>;
}

interface TrivyReport {
  Results?: TrivyResult[];
}

/**
 * Parse Trivy JSON output (supports Vulnerabilities, Misconfigurations, Secrets).
 */
export function parseTrivy(
  jsonContent: string | Buffer,
  scanId: string,
  scanner: string = 'trivy'
): { findings: NewFinding[]; summary: Record<string, number> } {
  let report: TrivyReport;
  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    report = JSON.parse(text);
  } catch {
    return { findings: [], summary: {} };
  }

  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const results = report.Results || [];

  for (const res of results) {
    // Vulnerabilities
    for (const v of res.Vulnerabilities || []) {
      const sev = mapTrivySeverity(v.Severity);
      severityCount[sev]++;
      findings.push({
        scan_id: scanId,
        scanner,
        rule: v.VulnerabilityID,
        severity: sev,
        file_path: res.Target,
        message: `${v.PkgName || ''}@${v.InstalledVersion || ''}: ${v.Title || v.Description || ''}`,
        description: v.Description || '',
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Misconfigurations
    for (const m of res.Misconfigurations || []) {
      const sev = mapTrivySeverity(m.Severity);
      severityCount[sev]++;
      findings.push({
        scan_id: scanId,
        scanner,
        rule: m.ID,
        severity: sev,
        file_path: res.Target,
        message: m.Title,
        description: m.Message,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Secrets
    for (const s of res.Secrets || []) {
      const sev = mapTrivySeverity(s.Severity);
      severityCount[sev]++;
      findings.push({
        scan_id: scanId,
        scanner,
        rule: s.RuleID,
        severity: sev,
        file_path: res.Target,
        message: s.Title,
        description: s.Match,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  return { findings, summary: severityCount };
}

function mapTrivySeverity(sev: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  if (s === 'LOW') return 'low';
  return 'info';
}
