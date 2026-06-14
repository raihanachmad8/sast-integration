/**
 * Scan result parser dispatcher.
 * 
 * Supports both native formats and SARIF v2 (used by CI/CD uploads).
 * Auto-detects SARIF by checking for `runs` key in JSON content.
 */

import { parseGCCFanalyzer } from './gcc-fanalyzer.parser';
import { parseSemgrep } from './semgrep.parser';
import { parseCppcheck } from './cppcheck.parser';
import { parseGitleaks } from './gitleaks.parser';
import { parseFlawfinder } from './flawfinder.parser';
import { parseClangTidy } from './clang-tidy.parser';
import { type NewFinding } from '@drizzle/schema/findings';

export interface ParseResult {
  findings: NewFinding[];
  summary: Record<string, number>;
}

/**
 * Detect if content is SARIF v2 format.
 */
function isSarifContent(content: string | Buffer): boolean {
  try {
    const text = typeof content === 'string' ? content : content.toString('utf8');
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('{')) return false;
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed.runs);
  } catch {
    return false;
  }
}

/**
 * Parse SARIF v2 format into normalized findings.
 * Preserves the original scanner name from the caller.
 */
function parseSarif(content: string | Buffer, scanId: string, scanner: string): ParseResult {
  try {
    const text = typeof content === 'string' ? content : content.toString('utf8');
    const sarif = JSON.parse(text);
    const findings: NewFinding[] = [];
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    const runs = sarif.runs || [];
    for (const run of runs) {
      // Build rule lookup from tool.rules
      const ruleMap = new Map<string, Record<string, unknown>>();
      for (const rule of (run.tool?.driver?.rules ?? [])) {
        ruleMap.set(rule.id, rule);
      }

      const results = run.results || [];
      for (const r of results) {
        // Get rule info for severity
        const rule = ruleMap.get(r.ruleId ?? '') as Record<string, unknown> | undefined;
        const defaultConfig = rule?.defaultConfiguration as { level?: string } | undefined;
        const level = r.level ?? defaultConfig?.level ?? 'warning';
        const severity = (level === 'error' ? 'high' : level === 'warning' ? 'medium' : level === 'note' ? 'low' : 'low') as keyof typeof summary;
        if (severity in summary) summary[severity]++;

        // Extract file path and line
        const loc = r.locations?.[0]?.physicalLocation;
        const filePath = loc?.artifactLocation?.uri;
        const lineNumber = loc?.region?.startLine;

        // Extract CWE from rule.tags or relationships
        let cweId: string | null = null;
        const relationships = rule?.relationships as Array<{ target?: { id?: string } }> | undefined;
        if (relationships) {
          for (const rel of relationships) {
            if (rel.target?.id?.startsWith('CWE-')) {
              cweId = rel.target.id;
              break;
            }
          }
        }
        // Also check tags
        if (!cweId && Array.isArray(rule?.tags)) {
          for (const tag of rule.tags as string[]) {
            const cweMatch = tag.match(/CWE-(\d+)/);
            if (cweMatch) {
              cweId = `CWE-${cweMatch[1]}`;
              break;
            }
          }
        }

        findings.push({
          scanId,
          scanner,
          rule: (rule?.name as string) ?? r.ruleId ?? 'unknown',
          severity,
          filePath,
          lineNumber,
          message: r.message?.text || '',
          description: r.message?.text || '',
          cweId,
          status: 'open',
        });
      }
    }
    return { findings, summary };
  } catch {
    return { findings: [], summary: {} };
  }
}

/**
 * Main entry point for parsing any supported scanner report.
 * Auto-detects SARIF format and routes accordingly.
 */
export function parseScanResult(
  scanner: string,
  content: string | Buffer,
  scanId: string
): ParseResult {
  const lower = scanner.toLowerCase().replace(/\.(json|xml|sarif|txt)$/, '');

  // Auto-detect SARIF format — use unified SARIF parser
  if (isSarifContent(content)) {
    return parseSarif(content, scanId, scanner);
  }

  if (lower === 'semgrep') {
    return parseSemgrep(content, scanId, 'semgrep');
  }

  if (lower === 'cppcheck') {
    return parseCppcheck(content, scanId, 'cppcheck');
  }

  if (lower === 'gitleaks') {
    return parseGitleaks(content, scanId, 'gitleaks');
  }

  if (lower === 'flawfinder') {
    return parseFlawfinder(content, scanId, 'flawfinder');
  }

  if (lower === 'clang-tidy' || lower === 'clantidy') {
    return parseClangTidy(content, scanId, 'clang-tidy');
  }

  if (lower === 'gcc-fanalyzer' || lower === 'gccfanalyzer' || lower === 'gcc') {
    return parseGCCFanalyzer(content, scanId, 'gcc-fanalyzer');
  }

  return { findings: [], summary: {} };
}

export { parseSemgrep, parseCppcheck, parseGitleaks, parseFlawfinder, parseClangTidy, parseGCCFanalyzer };
