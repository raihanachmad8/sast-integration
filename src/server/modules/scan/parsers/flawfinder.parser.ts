import { type NewFinding } from '@drizzle/schema/findings';

/**
 * Parse Flawfinder text output.
 *
 * Flawfinder typical line format:
 *   ./path/file.c:42:  [2] (buffer) strcpy: Does not check for buffer overflows...
 *
 * We extract file, line, severity level, rule, and message.
 */
export function parseFlawfinder(
  textContent: string | Buffer,
  scanId: string,
  scanner: string = 'flawfinder'
): { findings: NewFinding[]; summary: Record<string, number> } {
  const text = typeof textContent === 'string' ? textContent : textContent.toString('utf8');

  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  // Match lines like: ./file.c:123:  [2] (buffer) strcpy: message here
  // Allow optional leading whitespace and various spacing
  const lineRegex = /^\s*(.+?):(\d+):\s*\[(\d+)\]\s*\(([^)]+)\)\s*([^:]+?):\s*(.+)$/gm;

  let match;
  while ((match = lineRegex.exec(text)) !== null) {
    const [, filePath, lineStr, levelStr, category, rule, message] = match;

    const line = parseInt(lineStr, 10);
    const level = parseInt(levelStr, 10);

    // Map Flawfinder level (1-5) to our severity
    let severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'low';
    if (level >= 5) severity = 'critical';
    else if (level >= 4) severity = 'high';
    else if (level >= 3) severity = 'medium';
    else if (level >= 2) severity = 'low';

    severityCount[severity]++;

    findings.push({
      scan_id: scanId,
      scanner,
      rule: rule.trim(),
      severity,
      file_path: filePath.trim(),
      line_number: line,
      message: message.trim(),
      description: `${category}: ${message.trim()}`,
      status: 'open',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return { findings, summary: severityCount };
}
