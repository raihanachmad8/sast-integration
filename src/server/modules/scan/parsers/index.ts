import { parseSemgrep } from './semgrep.parser';
import { parseCppcheck } from './cppcheck.parser';
import { parseGitleaks } from './gitleaks.parser';
import { parseTrivy } from './trivy.parser';
import { parseFlawfinder } from './flawfinder.parser';
import { type NewFinding } from '@drizzle/schema/findings';

export interface ParseResult {
  findings: NewFinding[];
  summary: Record<string, number>;
}

/**
 * Main entry point for parsing any supported scanner report.
 *
 * Dispatches to the correct parser based on scanner name / file extension.
 * Returns normalized findings ready to be persisted.
 */
export function parseScanResult(
  scanner: string,
  content: string | Buffer,
  scanId: string
): ParseResult {
  const lower = scanner.toLowerCase().replace(/\.(json|xml|sarif)$/, '');

  if (lower === 'semgrep') {
    return parseSemgrep(content, scanId, 'semgrep');
  }

  if (lower === 'cppcheck') {
    return parseCppcheck(content, scanId, 'cppcheck');
  }

  if (lower === 'gitleaks') {
    return parseGitleaks(content, scanId, 'gitleaks');
  }

  if (lower === 'trivy') {
    return parseTrivy(content, scanId, 'trivy');
  }

  if (lower === 'flawfinder') {
    return parseFlawfinder(content, scanId, 'flawfinder');
  }

  // Basic SARIF support (very common standard)
  if (lower === 'sarif' || scanner.endsWith('.sarif')) {
    return parseSarifStub(content, scanId);
  }

  return { findings: [], summary: {} };
}

/**
 * Purpose: Parse SARIF v2 format output into normalized findings.
 * This is a basic implementation that can be expanded for full SARIF support.
 *
 * @param content - The SARIF JSON content (string or Buffer)
 * @param scanId - The scan ID to associate findings with
 * @returns Parsed findings and severity summary
 */
function parseSarifStub(content: string | Buffer, scanId: string): ParseResult {
  try {
    const text = typeof content === 'string' ? content : content.toString('utf8');
    const sarif = JSON.parse(text);
    const findings: NewFinding[] = [];
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    const runs = sarif.runs || [];
    for (const run of runs) {
      const results = run.results || [];
      for (const r of results) {
        const severity = (r.level === 'error' ? 'high' : r.level === 'warning' ? 'medium' : 'low') as keyof typeof summary;
        if (severity in summary) summary[severity]++;

        findings.push({
          scan_id: scanId,
          scanner: 'sarif',
          rule: r.ruleId || 'sarif-rule',
          severity,
          file_path: r.locations?.[0]?.physicalLocation?.artifactLocation?.uri,
          line_number: r.locations?.[0]?.physicalLocation?.region?.startLine,
          message: r.message?.text || '',
          status: 'open',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    return { findings, summary };
  } catch {
    return { findings: [], summary: {} };
  }
}

export { parseSemgrep, parseCppcheck, parseGitleaks, parseTrivy, parseFlawfinder };
