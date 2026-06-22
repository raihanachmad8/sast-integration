import { type NewFinding } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { normalizeFilePath } from './path-normalizer';
import type { Severity } from '@/commons/types/domain';
import type { ParseResult } from './index';

interface SemgrepResult {
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
 * Semgrep parser — converts Semgrep output into normalized findings.
 * 
 * Semgrep is a multi-language static analysis tool that detects security
 * vulnerabilities, code quality issues, and enforces coding standards.
 * 
 * ## Supported Formats
 * 
 * ### Native JSON (preferred)
 * ```json
 * {
 *   "results": [{
 *     "check_id": "python.lang.security.audit.dangerous-system-call",
 *     "path": "app.py",
 *     "start": { "line": 42 },
 *     "extra": {
 *       "message": "Detected system call",
 *       "severity": "WARNING",
 *       "metadata": { "cwe": ["CWE-78"] },
 *       "lines": "os.system(cmd)"
 *     }
 *   }]
 * }
 * ```
 * 
 * ### SARIF (fallback)
 * ```json
 * {
 *   "runs": [{
 *     "results": [{
 *       "ruleId": "...",
 *       "level": "warning",
 *       "message": { "text": "..." },
 *       "locations": [...]
 *     }]
 *   }]
 * }
 * ```
 * 
 * ## Severity Mapping
 * - CRITICAL → critical
 * - HIGH, ERROR → high
 * - MEDIUM, WARNING → medium
 * - LOW, INFO → low
 * 
 * ## CWE Extraction
 * Extracts CWE identifiers from rule metadata (native JSON) or SARIF rule properties.
 * 
 * @module scan/parsers/semgrep
 * 
 * @example
 * ```ts
 * import { parseSemgrep } from './semgrep.parser';
 * 
 * const result = parseSemgrep(jsonContent, scanId, 'semgrep');
 * // result.findings: NewFinding[]
 * // result.summary: { critical: 0, high: 1, medium: 2, low: 0, info: 0 }
 * ```
 */
export function parseSemgrep(
  jsonContent: string | Buffer,
  scanId: string,
  scanner: string = 'semgrep'
): ParseResult {
  logger.scan.debug('parseSemgrep', { scanId });

  let parsed: Record<string, unknown>;
  try {
    const text = typeof jsonContent === 'string' ? jsonContent : jsonContent.toString('utf8');
    parsed = JSON.parse(text);
  } catch {
    throw new AppError('Invalid Semgrep JSON report', 422, 'VALIDATION_ERROR');
  }

  // Try native JSON format first
  if (Array.isArray(parsed.results)) {
    return parseSemgrepNativeJson(parsed as unknown as SemgrepReport, scanId, scanner);
  }

  // Fallback: SARIF format
  if (Array.isArray(parsed.runs)) {
    logger.scan.debug('parseSemgrep: using SARIF fallback');
    return parseSemgrepSarif(parsed, scanId, scanner);
  }

  return { findings: [], summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } };
}

/**
 * Parse Semgrep native JSON format.
 */
function parseSemgrepNativeJson(
  report: SemgrepReport,
  scanId: string,
  scanner: string
): ParseResult {
  const findings: NewFinding[] = [];
  const severityCount: Record<string, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };

  for (const r of report.results ?? []) {
    const severity = mapSemgrepSeverity(r.extra?.severity);
    if (severity in severityCount) severityCount[severity as keyof typeof severityCount]++;

    const cwe = extractCwe(r.extra?.metadata?.cwe);

    findings.push({
      scanId: scanId,
      scanner,
      rule: r.check_id,
      severity,
      filePath: normalizeFilePath(r.path),
      lineNumber: r.start?.line ?? null,
      message: r.extra?.message ?? '',
      description: r.extra?.message ?? '',
      codeSnippet: r.extra?.lines ?? null,
      cweId: cwe,
    });
  }

  logger.scan.debug('parseSemgrepNativeJson completed', { findingsCount: findings.length });
  return { findings, summary: severityCount };
}

/**
 * Parse Semgrep SARIF format.
 * SARIF structure: runs[0].results[].{ruleId, level, message.text, locations}
 */
function parseSemgrepSarif(
  sarif: Record<string, unknown>,
  scanId: string,
  scanner: string
): ParseResult {
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

    const severity = mapSemgrepSeverity(level);
    if (severity in severityCount) severityCount[severity as keyof typeof severityCount]++;

    // Try to extract CWE from rule metadata
    const ruleObj = runs?.[0]?.tool as Record<string, unknown> | undefined;
    const driver = ruleObj?.driver as Record<string, unknown> | undefined;
    const rules = driver?.rules as Record<string, unknown>[] | undefined;
    const ruleDef = rules?.find((ru) => ru.id === ruleId);
    const ruleMetadata = (ruleDef as Record<string, unknown>)?.properties as Record<string, unknown> | undefined;
    const cweList = ruleMetadata?.['cwes'] as Record<string, unknown>[] | undefined;
    const cweObj = cweList?.[0] as Record<string, unknown> | undefined;
    const cweId = cweObj?.cwe_id as string | undefined;

    // Extract code snippet: try region.snippet.text (standard), fallback to properties.snippet
    const snippetObj = region?.snippet as Record<string, unknown> | undefined;
    const codeSnippet = (snippetObj?.text as string)
      ?? extractSnippetFromProperties(r.properties as Record<string, unknown> | undefined);

    findings.push({
      scanId: scanId,
      scanner,
      rule: ruleId,
      severity,
      filePath: normalizeFilePath(filePath),
      lineNumber: line,
      message,
      description: message,
      codeSnippet: codeSnippet,
      cweId: cweId ?? null,
    });
  }

  logger.scan.debug('parseSemgrepSarif completed', { findingsCount: findings.length });
  return { findings, summary: severityCount };
}

function mapSemgrepSeverity(sev: string | undefined): Severity {
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
  if (Array.isArray(cwe)) return cwe[0] ?? null;
  return cwe;
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

  if (typeof snippet === 'string') return snippet;

  return null;
}
