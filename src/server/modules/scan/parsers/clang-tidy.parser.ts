import { type NewFinding } from '@drizzle/schema/findings';
import { logger } from '@/server/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClangTidyDiagnostic {
  file: string;
  line: number;
  col: number;
  level: 'warning' | 'error' | 'note';
  message: string;
  checkName: string;
}

// ─── Regex Patterns ─────────────────────────────────────────────────────────

// Matches: /path/file.c:42:12: warning: message [check-name]
// Also handles Windows paths: C:\path\file.c:42:12: warning: message [check-name]
// Uses greedy match (.+) for file path, then backtracks to find line:col: level:
// eslint-disable-next-line no-useless-escape
const DIAG_RE = /^(.+):(\d+):(\d+):\s+(warning|error|note):\s+(.+?)(?:\s+\[([^\]]+)\])?\s*$/;

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Clang-Tidy parser — converts Clang-Tidy text output into normalized findings.
 * 
 * Clang-Tidy is a clang-based linter with static analysis checks for C/C++.
 * It detects coding style issues, potential bugs, and security vulnerabilities.
 * 
 * ## Output Format
 * ```
 * /path/file.c:42:12: warning: message [check-name]
 * /path/file.c:42:12: error: message [check-name]
 * /path/file.c:42:12: note: context message
 * ```
 * 
 * ## Check Categories
 * - `clang-analyzer-*`: Static analysis checks (null dereference, use-after-free, etc.)
 * - `cert-*`: CERT C/C++ coding standard violations
 * - `bugprone-*`: Bug-prone code patterns
 * - `security-*`: Security-focused checks
 * 
 * ## Severity Mapping
 * - Error level → high
 * - cert-* or security-* checks → high
 * - clang-analyzer-* checks → medium
 * - bugprone-* checks → medium
 * - Other checks → low
 * 
 * ## Notes Handling
 * Notes are context lines that follow warnings/errors. They are skipped
 * during parsing but the current finding remains active for subsequent notes.
 * 
 * @module scan/parsers/clang-tidy
 * 
 * @example
 * ```ts
 * import { parseClangTidy } from './clang-tidy.parser';
 * 
 * const content = `
 * /path/file.c:42:12: warning: null pointer dereference [clang-analyzer-core.NullDereference]
 * /path/file.c:42:12: note: 'ptr' initialized to null
 * `;
 * 
 * const result = parseClangTidy(content, scanId, 'clang-tidy');
 * // result.findings: [{ rule: 'clang-analyzer-core.NullDereference', severity: 'medium', ... }]
 * ```
 */
export function parseClangTidy(
  content: string | Buffer,
  scanId: string,
  scanner: string = 'clang-tidy',
): { findings: NewFinding[]; summary: Record<string, number> } {
  const text = typeof content === 'string' ? content : content.toString('utf8');

  logger.scan.debug('parseClangTidy', { length: text.length });

  const findings: NewFinding[] = [];
  const summary: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const lines = text.split('\n');
  let currentFinding: ClangTidyDiagnostic | null = null;

  for (const line of lines) {
    const m = line.match(DIAG_RE);
    if (!m) continue;

    const [, file, lineStr, colStr, level, message, checkName] = m;
    const lineNum = parseInt(lineStr, 10);
    const colNum = parseInt(colStr, 10);

    // Skip system header warnings (not from user code)
    // Match patterns like: /usr/include/..., /usr/lib/..., <built-in>, <scratch space>
    if (file.startsWith('<') || file.includes('/usr/include/') || file.includes('/usr/lib/') || file.includes('\\include\\') || file.includes('\\lib\\')) continue;

    if (level === 'warning' || level === 'error') {
      // Commit previous finding
      if (currentFinding) {
        findings.push(createFinding(currentFinding, scanId, scanner));
      }

      currentFinding = {
        file,
        line: lineNum,
        col: colNum,
        level: level as 'warning' | 'error',
        message,
        checkName: checkName || 'unknown',
      };
    } else if (level === 'note' && currentFinding) {
      // Notes are context for the current finding — we skip them
      // but keep the current finding active
    }
  }

  // Commit last finding
  if (currentFinding) {
    findings.push(createFinding(currentFinding, scanId, scanner));
  }

  // Build summary
  for (const f of findings) {
    if (f.severity in summary) summary[f.severity]++;
  }

  logger.scan.debug('parseClangTidy completed', { findingsCount: findings.length });
  return { findings, summary };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFinding(diag: ClangTidyDiagnostic, scanId: string, scanner: string): NewFinding {
  const severity = mapSeverity(diag.level, diag.checkName);

  return {
    scanId: scanId,
    scanner,
    rule: diag.checkName,
    severity,
    filePath: diag.file,
    lineNumber: diag.line,
    message: diag.message,
    description: diag.message,
    status: 'open',
  };
}

function mapSeverity(level: string, checkName: string): string {
  if (level === 'error') return 'high';

  // Cert and security checks are more severe
  if (checkName.startsWith('cert-') || checkName.startsWith('security-')) return 'high';
  if (checkName.startsWith('clang-analyzer-')) return 'medium';
  if (checkName.startsWith('bugprone-')) return 'medium';

  return 'low';
}
