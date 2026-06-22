import { type NewFinding } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';
import { normalizeFilePath } from './path-normalizer';
import type { Severity } from '@/commons/types/domain';
import type { ParseResult } from './index';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GCCFanalyzerDiagnostic {
  file: string;
  line: number;
  col: number;
  message: string;
  ruleId: string;
  cwe?: string;
  flowSteps: Array<{ line: number; message: string }>;
}

// ─── Regex Patterns ─────────────────────────────────────────────────────────

// Matches: /path/file.c:42:12: warning: message [CWE-XXX] [-Wcheck-name]
// Or: /path/file.c:42:12: warning: message [-Wcheck-name]
// Or: /path/file.c:42:12: warning: message (without [-W...] suffix)
const DIAG_RE = /^(.+?):(\d+):(\d+):\s+(warning|error):\s+(.+?)(?:\s+\[(-W[^\]]+)\])?\s*$/;

// Matches CWE from message: [CWE-476]
const CWE_RE = /\[CWE-(\d+)\]/;

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * GCC -fanalyzer parser — converts GCC's static analysis output into normalized findings.
 * 
 * GCC's `-fanalyzer` flag enables a static analysis pass that detects various
 * runtime errors including:
 * - Null pointer dereferences
 * - Use-after-free
 * - Buffer overflows
 * - Memory leaks
 * - Double frees
 * 
 * ## Output Format
 * ```
 * /path/file.c:42:12: warning: message [CWE-XXX] [-Wcheck-name]
 * /path/file.c:42:12: warning: message [-Wcheck-name]
 * /path/file.c:42:12: note: context message
 * ```
 * 
 * ## CWE Extraction
 * The parser extracts CWE identifiers from the message when present (e.g., `[CWE-476]`).
 * CWEs are used for severity mapping and vulnerability classification.
 * 
 * ## Severity Mapping
 * 
 * ### CWE-based
 * - CWE-416 (Use After Free): high
 * - CWE-476 (Null Pointer Dereference): high
 * - CWE-78 (OS Command Injection): high
 * - CWE-120 (Buffer Copy without Checking Size): high
 * - CWE-125 (Out-of-bounds Read): high
 * - CWE-401 (Memory Leak): medium
 * - CWE-690 (NULL Dereference): medium
 * - CWE-190 (Integer Overflow): medium
 * 
 * ### Rule-based
 * - null-dereference, use-after-free: high
 * - malloc-leak, null-argument: medium
 * - unused-variable: low
 * - Other: medium
 * 
 * ## Flow Traces
 * GCC -fanalyzer produces detailed flow traces showing the execution path
 * leading to the error. These are captured as `flowSteps` and included in
 * the finding description for better debugging context.
 * 
 * @module scan/parsers/gcc-fanalyzer
 * 
 * @example
 * ```ts
 * import { parseGCCFanalyzer } from './gcc-fanalyzer.parser';
 * 
 * const content = `
 * /path/file.c:42:12: warning: dereference of null 'ptr' [CWE-476] [-Wnull-dereference]
 * /path/file.c:40:5: note: 'ptr' declared here
 * `;
 * 
 * const result = parseGCCFanalyzer(content, scanId, 'gcc-fanalyzer');
 * // result.findings: [{ rule: '-Wnull-dereference', severity: 'high', cweId: 'CWE-476', ... }]
 * ```
 */
export function parseGCCFanalyzer(
  content: string | Buffer,
  scanId: string,
  scanner: string = 'gcc-fanalyzer',
): ParseResult {
  const text = typeof content === 'string' ? content : content.toString('utf8');

  logger.scan.debug('parseGCCFanalyzer', { length: text.length });

  const findings: NewFinding[] = [];
  const summary: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const lines = text.split('\n');
  let current: GCCFanalyzerDiagnostic | null = null;

  for (const line of lines) {
    const m = line.match(DIAG_RE);
    if (!m) continue;

    const [, file, lineStr, colStr, level, message, ruleId] = m;
    const lineNum = parseInt(lineStr, 10);
    const colNum = parseInt(colStr, 10);

    // Skip system header warnings (not from user code)
    // Match patterns like: /usr/include/..., /usr/lib/..., <built-in>, <scratch space>
    if (file.startsWith('<') || file.includes('/usr/include/') || file.includes('/usr/lib/') || file.startsWith('\\include\\') || file.startsWith('\\lib\\') || /^[A-Z]:\\(Program Files|msys64|LLVM)\\/.test(file)) continue;

    // Extract CWE from message if present
    const cweMatch = message.match(CWE_RE);
    const cwe = cweMatch ? `CWE-${cweMatch[1]}` : undefined;

    if (level === 'warning' || level === 'error') {
      // Commit previous finding
      if (current) {
        findings.push(createFinding(current, scanId, scanner));
      }

      current = {
        file,
        line: lineNum,
        col: colNum,
        message: message.replace(/\s*\[CWE-\d+\]/, ''), // Remove CWE from message
        ruleId,
        cwe,
        flowSteps: [],
      };
    } else if (level === 'note' && current) {
      // Add flow step
      current.flowSteps.push({ line: lineNum, message });
    }
  }

  // Commit last finding
  if (current) {
    findings.push(createFinding(current, scanId, scanner));
  }

  // Build summary
  for (const f of findings) {
    if (f.severity in summary) summary[f.severity]++;
  }

  logger.scan.debug('parseGCCFanalyzer completed', { findingsCount: findings.length });
  return { findings, summary };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFinding(diag: GCCFanalyzerDiagnostic, scanId: string, scanner: string): NewFinding {
  const severity = mapSeverity(diag.ruleId, diag.cwe);

  // Build description with flow trace
  let description = diag.message;
  if (diag.flowSteps.length > 0) {
    const stepsText = diag.flowSteps.slice(0, 10).map(s => `  line ${s.line}: ${s.message}`).join('\n');
    description += `\n\nAnalysis path:\n${stepsText}`;
  }

  return {
    scanId: scanId,
    scanner,
    rule: diag.ruleId,
    severity,
    filePath: normalizeFilePath(diag.file),
    lineNumber: diag.line,
    message: diag.message,
    description,
    cweId: diag.cwe ?? null,
  };
}

function mapSeverity(ruleId: string, cwe?: string): Severity {
  // CWE-based severity
  if (cwe) {
    if (['CWE-416', 'CWE-476', 'CWE-78', 'CWE-120', 'CWE-125'].includes(cwe)) return 'high';
    if (['CWE-401', 'CWE-690', 'CWE-190'].includes(cwe)) return 'medium';
  }

  // Rule-based severity
  if (ruleId.includes('null-dereference') || ruleId.includes('use-after-free')) return 'high';
  if (ruleId.includes('malloc-leak') || ruleId.includes('null-argument')) return 'medium';
  if (ruleId.includes('unused-variable')) return 'low';

  return 'medium';
}
