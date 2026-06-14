import { XMLParser } from 'fast-xml-parser';
import { type NewFinding } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  isArray: (name) => name === 'error' || name === 'location',
});

/**
 * Cppcheck parser — converts Cppcheck output into normalized findings.
 *
 * Supports two input formats:
 * 1. Native XML (direct from cppcheck)
 * 2. SARIF (from CI/CD converters)
 *
 * @module scan/parsers/cppcheck
 */
export function parseCppcheck(
  content: string | Buffer,
  scanId: string,
  scanner: string = 'cppcheck'
): { findings: NewFinding[]; summary: Record<string, number> } {
  const text = typeof content === 'string' ? content : content.toString('utf8');

  // Try SARIF format first (CI/CD uploads)
  try {
    const sarif = JSON.parse(text);
    if (sarif.runs?.[0]?.results) {
      logger.scan.debug('parseCppcheck: using SARIF format');
      return parseCppcheckSarif(sarif, scanId, scanner);
    }
  } catch {
    // Not SARIF, try XML format
  }

  // Fallback: XML format (native cppcheck output)
  return parseCppcheckXml(text, scanId, scanner);
}

/**
 * Parse Cppcheck XML output.
 */
function parseCppcheckXml(
  text: string,
  scanId: string,
  scanner: string
): { findings: NewFinding[]; summary: Record<string, number> } {
  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  let parsed: unknown;
  try {
    parsed = xmlParser.parse(text);
  } catch (e) {
    logger.scan.error('Failed to parse Cppcheck XML:', e as Error);
    return { findings, summary: severityCount };
  }

  // Cppcheck XML structure: <results><error id="..." severity="..." msg="..."><location file="..." line="..."/></error></results>
  // After fast-xml-parser with isArray: { results: { error: [{ @_id, @_severity, @_msg, location: [{ @_file, @_line }] }] } }
  const parsedObj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
  const resultsObj = (parsedObj.results ?? parsedObj) as Record<string, unknown> | undefined;

  // Extract error array — handle both { error: [...] } and flat array formats
  let errorList: Record<string, unknown>[] = [];
  if (resultsObj) {
    const errors = resultsObj['error'];
    if (Array.isArray(errors)) {
      errorList = errors;
    } else if (errors && typeof errors === 'object') {
      errorList = [errors as Record<string, unknown>];
    }
  }

  for (const err of errorList) {
    if (!err) continue;

    // Extract attributes with @_ prefix (fast-xml-parser convention)
    const attrs = (err['@_'] as Record<string, unknown>) ?? err;
    const id = (attrs['@_id'] as string) ?? (attrs.id as string) ?? 'cppcheck-unknown';
    const severityRaw = (attrs['@_severity'] as string) ?? (attrs.severity as string) ?? 'medium';
    const msg = (attrs['@_msg'] as string) ?? (attrs.msg as string) ?? (attrs['@_verbose'] as string) ?? (attrs.verbose as string) ?? '';
    const cwe = attrs['@_cwe'] ?? attrs.cwe;

    // Extract first location
    let locations = err['location'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (!Array.isArray(locations)) locations = locations ? [locations] : [];
    const firstLoc = (locations[0] ?? {}) as Record<string, unknown>;
    const locAttrs = (firstLoc['@_'] as Record<string, unknown>) ?? firstLoc;

    const filePath = (locAttrs['@_file'] as string) ?? (locAttrs.file as string) ?? null;
    const lineStr = locAttrs['@_line'] ?? locAttrs.line;
    const line = lineStr ? parseInt(String(lineStr), 10) : null;

    const severity = mapCppcheckSeverity(String(severityRaw));

    if (severity in severityCount) {
      severityCount[severity as keyof typeof severityCount]++;
    }

    findings.push({
      scanId: scanId,
      scanner,
      rule: String(id),
      severity,
      filePath: filePath,
      lineNumber: isNaN(line as number) ? null : line,
      message: String(msg),
      description: String(msg),
      cweId: cwe ? String(cwe) : null,
      status: 'open',
    });
  }

  return { findings, summary: severityCount };
}

/**
 * Parse Cppcheck SARIF output (from CI/CD converters).
 * Extracts code snippets from region.snippet.text or properties.snippet.
 */
function parseCppcheckSarif(
  sarif: Record<string, unknown>,
  scanId: string,
  scanner: string
): { findings: NewFinding[]; summary: Record<string, number> } {
  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };

  const runs = sarif.runs as Record<string, unknown>[] | undefined;
  const results = runs?.[0]?.results as Record<string, unknown>[] ?? [];

  for (const r of results) {
    const ruleId = (r.ruleId as string) ?? 'unknown';
    const level = (r.level as string) ?? 'warning';
    const messageObj = r.message as Record<string, unknown> | undefined;
    const message = (messageObj?.text as string) ?? '';

    const locs = r.locations as Record<string, unknown>[] | undefined;
    const physLoc = locs?.[0]?.physicalLocation as Record<string, unknown> | undefined;
    const artifactLoc = physLoc?.artifactLocation as Record<string, unknown> | undefined;
    const region = physLoc?.region as Record<string, unknown> | undefined;

    const filePath = (artifactLoc?.uri as string) ?? 'unknown';
    const line = (region?.startLine as number) ?? null;

    // Extract code snippet: try region.snippet.text (standard), fallback to properties.snippet
    const snippetObj = region?.snippet as Record<string, unknown> | undefined;
    const codeSnippet = (snippetObj?.text as string)
      ?? extractSnippetFromProperties(r.properties as Record<string, unknown> | undefined);

    // Extract CWE from properties
    const props = r.properties as Record<string, unknown> | undefined;
    const cweStr = props?.cwe as string | undefined;
    const cweId = cweStr?.replace(/^CWE-/, '') ?? null;

    const severity = mapCppcheckSeverity(level);
    if (severity in severityCount) severityCount[severity as keyof typeof severityCount]++;

    findings.push({
      scanId: scanId,
      scanner,
      rule: ruleId,
      severity,
      filePath: filePath,
      lineNumber: line,
      message,
      description: message,
      codeSnippet: codeSnippet,
      cweId: cweId,
      status: 'open',
    });
  }

  return { findings, summary: severityCount };
}

/**
 * Extract plain text snippet from properties.snippet (CI/CD converter format).
 * The converter produces: { startLine, endLine, lines: [{ lineNumber, content, isVulnerable }] }
 */
function extractSnippetFromProperties(props?: Record<string, unknown>): string | null {
  if (!props) return null;

  const snippet = props.snippet;
  if (!snippet || typeof snippet !== 'object') return null;

  const snippetObj = snippet as Record<string, unknown>;
  const lines = snippetObj.lines;

  if (Array.isArray(lines)) {
    return lines
      .map((l: Record<string, unknown>) => l.content as string)
      .filter(Boolean)
      .join('\n');
  }

  // If snippet is a plain string, use it directly
  if (typeof snippet === 'string') return snippet;

  return null;
}

function mapCppcheckSeverity(sev: string): string {
  const s = String(sev).toLowerCase();
  if (s === 'error') return 'high';
  if (s === 'warning') return 'medium';
  if (s === 'style' || s === 'performance' || s === 'portability') return 'low';
  if (s === 'information') return 'info';
  return 'medium';
}
