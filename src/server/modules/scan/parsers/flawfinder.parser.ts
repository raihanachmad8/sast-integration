import { type NewFinding } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';

/**
 * Flawfinder parser — converts Flawfinder output into normalized findings.
 * 
 * Flawfinder is a static analysis tool for C/C++ that detects potential
 * security vulnerabilities by scanning for dangerous function calls
 * (e.g., strcpy, sprintf, gets).
 * 
 * This parser supports two output formats:
 * 
 * ## SARIF Format (preferred)
 * ```json
 * {
 *   "runs": [{
 *     "results": [{
 *       "ruleId": "strcpy",
 *       "level": "warning",
 *       "message": { "text": "..." },
 *       "locations": [{
 *         "physicalLocation": {
 *           "artifactLocation": { "uri": "file.c" },
 *           "region": { "startLine": 42, "snippet": { "text": "..." } }
 *         }
 *       }]
 *     }]
 *   }]
 * }
 * ```
 * 
 * ## Text Format (fallback)
 * ```
 * ./path/file.c:42:5:  [2] (buffer) strcpy: Potential buffer overflow
 * ```
 * 
 * Severity mapping (Flawfinder level → normalized severity):
 * - Level 5+: critical
 * - Level 4: high
 * - Level 3: medium
 * - Level 2: low
 * - Level 1: info
 * 
 * @module scan/parsers/flawfinder
 * 
 * @example
 * ```ts
 * import { parseFlawfinder } from './flawfinder.parser';
 * 
 * // SARIF format
 * const sarifContent = JSON.stringify({ runs: [{ results: [...] }] });
 * const result = parseFlawfinder(sarifContent, scanId, 'flawfinder');
 * 
 * // Text format
 * const textContent = './file.c:42:5:  [3] (buffer) strcpy: ...';
 * const result = parseFlawfinder(textContent, scanId, 'flawfinder');
 * ```
 */
export function parseFlawfinder(
  textContent: string | Buffer,
  scanId: string,
  scanner: string = 'flawfinder'
): { findings: NewFinding[]; summary: Record<string, number> } {
  const text = typeof textContent === 'string' ? textContent : textContent.toString('utf8');

  logger.scan.debug('parseFlawfinder input', { length: text.length, first100: text.substring(0, 100) });

  // Try SARIF format first (JSON)
  try {
    const sarif = JSON.parse(text);
    if (sarif.runs?.[0]?.results) {
      logger.scan.debug('parseFlawfinder: using SARIF format', { resultsCount: sarif.runs[0].results.length });
      return parseFlawfinderSarif(sarif, scanId, scanner);
    }
  } catch {
    // Not SARIF, try text format
  }

  // Fallback: text format
  const textFindings = parseFlawfinderText(text, scanId, scanner);
  logger.scan.debug('parseFlawfinder text result', { findingsCount: textFindings.findings.length });

  return textFindings;
}

/**
 * Parse Flawfinder text output.
 * Format: C:\path\file.c:42:5:  [2] (buffer) strcpy: message
 * Note: line number is followed by column number before the [level]
 */
function parseFlawfinderText(
  text: string,
  scanId: string,
  scanner: string
): { findings: NewFinding[]; summary: Record<string, number> } {
  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };

  // Updated regex to handle filepath:line:col:  [level] format
  const lineRegex = /^\s*(.+?):(\d+):\d+:\s*\[(\d+)\]\s*\(([^)]+)\)\s*([^:]+?):\s*(.+)$/gm;

  let match;
  while ((match = lineRegex.exec(text)) !== null) {
    const [, filePath, lineStr, levelStr, category, rule, message] = match;
    const line = parseInt(lineStr, 10);
    const level = parseInt(levelStr, 10);

    let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'low';
    if (level >= 5) severity = 'critical';
    else if (level >= 4) severity = 'high';
    else if (level >= 3) severity = 'medium';
    else if (level >= 2) severity = 'low';

    severityCount[severity]++;

    findings.push({
      scanId: scanId,
      scanner,
      rule: rule.trim(),
      severity,
      filePath: filePath.trim(),
      lineNumber: line,
      message: message.trim(),
      description: `${category}: ${message.trim()}`,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { findings, summary: severityCount };
}

/**
 * Parse Flawfinder SARIF output.
 * SARIF structure: runs[0].results[].{ruleId, level, message.text, locations}
 */
function parseFlawfinderSarif(
  sarif: Record<string, unknown>,
  scanId: string,
  scanner: string
): { findings: NewFinding[]; summary: Record<string, number> } {
  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };

  const results = (sarif.runs as Record<string, unknown>[])?.[0]?.results ?? [];

  for (const r of results as Record<string, unknown>[]) {
    const ruleId = (r.ruleId as string) ?? 'unknown';
    const level = (r.level as string) ?? 'note';
    const messageObj = r.message as Record<string, unknown> | undefined;
    const message = (messageObj?.text as string) ?? '';

    const locs = r.locations as Record<string, unknown>[] | undefined;
    const physLoc = locs?.[0]?.physicalLocation as Record<string, unknown> | undefined;
    const artifactLoc = physLoc?.artifactLocation as Record<string, unknown> | undefined;
    const region = physLoc?.region as Record<string, unknown> | undefined;

    const filePath = (artifactLoc?.uri as string) ?? 'unknown';
    const line = (region?.startLine as number) ?? null;
    const snippetObj = region?.snippet as Record<string, unknown> | undefined;
    const codeSnippet = (snippetObj?.text as string) ?? null;

    // Map SARIF level to severity
    let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'low';
    if (level === 'error') severity = 'high';
    else if (level === 'warning') severity = 'medium';
    else if (level === 'note') severity = 'low';

    severityCount[severity]++;

    findings.push({
      scanId: scanId,
      scanner,
      rule: ruleId,
      severity,
      filePath: filePath,
      lineNumber: line,
      message: message,
      description: message,
      codeSnippet: codeSnippet,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { findings, summary: severityCount };
}
