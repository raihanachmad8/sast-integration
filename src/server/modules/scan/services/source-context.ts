/**
 * Source code context resolver — extracts code snippets around findings.
 * 
 * This module provides functions to read source files and extract meaningful
 * code context around findings, similar to the legacy system. It's used during
 * managed scan execution when source files are available on disk (in the cloned
 * repository).
 * 
 * ## Context Extraction Strategy
 * 
 * ### 1. Function-Level Extraction (preferred)
 * Attempts to extract the entire enclosing function around a finding.
 * Uses brace counting to find function boundaries:
 * - Walks backward to find function signature
 * - Walks forward to find closing brace
 * - Respects language-specific function patterns (C/C++/JS/TS/Go/Rust)
 * 
 * ### 2. Line Window Fallback
 * If function extraction fails or produces too large a snippet:
 * - Extracts a window of lines around the finding (±2 lines)
 * - Maximum 15 lines per snippet
 * 
 * ## Configuration
 * - `SOURCE_CONTEXT_RADIUS`: Lines above/below finding (default: 2)
 * - `MAX_FUNCTION_LINES`: Max lines for function context (default: 120)
 * - `MAX_SNIPPET_LINES`: Max lines for fallback snippet (default: 15)
 * 
 * @module scan/services/source-context
 * 
 * @example
 * ```ts
 * import { resolveCodeContext, resolveCodeContextsBatch } from './source-context';
 * 
 * // Single finding
 * const context = await resolveCodeContext(repoDir, 'src/app.c', 42);
 * // context: { codeSnippet: "void process() { ... }", codeSnippetStartLine: 38 }
 * 
 * // Batch (more efficient)
 * const contexts = await resolveCodeContextsBatch(repoDir, [
 *   { filePath: 'src/app.c', lineNumber: 42 },
 *   { filePath: 'src/utils.c', lineNumber: 15 },
 * ]);
 * ```
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '@/server/lib/logger';

const SOURCE_CONTEXT_RADIUS = 2; // Lines above/below finding
const MAX_FUNCTION_LINES = 120; // Max lines for function context
const MAX_SNIPPET_LINES = 15; // Max lines for fallback snippet

/**
 * Try to extract the enclosing function context around a finding.
 * Walks backward to find function signature, forward to find closing brace.
 */
function tryExtractEnclosingFunction(
  lines: string[],
  targetLine: number,
): { code: string; startLine: number } | null {
  // C/C++/Java/JS/TS/Go/Rust function signature patterns
  const funcStartPatterns = [
    /^(?:static\s+|extern\s+|inline\s+|virtual\s+)*(?:void|int|char|bool|float|double|long|short|unsigned|signed|auto|const|struct\s+\w+|enum\s+\w+)\s+\w+\s*\(/,
    /^\w+\s*\([^)]*\)\s*\{/,
    /^(?:pub\s+)?(?:fn|func|def|function)\s+/,
  ];

  // Walk backward to find function signature
  let startIdx = targetLine - 1;
  while (startIdx >= 0) {
    const line = lines[startIdx]?.trim() ?? '';
    if (funcStartPatterns.some((p) => p.test(line))) {
      break;
    }
    // Stop at file-level boundaries
    if (line === '' && startIdx > 0 && lines[startIdx - 1]?.trim() === '') {
      break;
    }
    startIdx--;
  }

  if (startIdx < 0) startIdx = 0;

  // Walk forward to find closing brace (simple brace counting)
  let braceCount = 0;
  let foundOpen = false;
  let endIdx = startIdx;

  for (let i = startIdx; i < Math.min(lines.length, startIdx + MAX_FUNCTION_LINES); i++) {
    const line = lines[i] ?? '';
    for (const ch of line) {
      if (ch === '{') {
        braceCount++;
        foundOpen = true;
      } else if (ch === '}') {
        braceCount--;
      }
    }
    if (foundOpen && braceCount <= 0) {
      endIdx = i;
      break;
    }
    endIdx = i;
  }

  const snippet = lines.slice(startIdx, endIdx + 1).join('\n');
  if (snippet.trim().length === 0) return null;

  return { code: snippet, startLine: startIdx + 1 };
}

/**
 * Extract a window of lines around the finding line.
 */
function extractLineWindow(
  lines: string[],
  targetLine: number,
  radius: number = SOURCE_CONTEXT_RADIUS,
): { code: string; startLine: number } {
  const start = Math.max(0, targetLine - 1 - radius);
  const end = Math.min(lines.length - 1, targetLine - 1 + radius);
  const code = lines.slice(start, end + 1).join('\n');
  return { code, startLine: start + 1 };
}

/**
 * Read a source file and extract code context around a finding.
 *
 * @param repoDir - Root directory of the cloned repository
 * @param filePath - File path relative to repo root (or absolute)
 * @param lineNumber - Line number of the finding
 * @returns Code snippet and start line, or null if file can't be read
 */
export async function resolveCodeContext(
  repoDir: string,
  filePath: string,
  lineNumber: number,
): Promise<{ codeSnippet: string; codeSnippetStartLine: number } | null> {
  try {
    // Normalize path — handle both absolute and relative paths
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(repoDir, filePath);
    }

    // Try to read the file
    const content = await readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');

    if (lineNumber < 1 || lineNumber > lines.length) {
      return null;
    }

    // Try to extract enclosing function first
    const funcContext = tryExtractEnclosingFunction(lines, lineNumber);
    if (funcContext && funcContext.code.split('\n').length <= MAX_SNIPPET_LINES) {
      return {
        codeSnippet: funcContext.code,
        codeSnippetStartLine: funcContext.startLine,
      };
    }

    // Fall back to line window
    const window = extractLineWindow(lines, lineNumber);
    return {
      codeSnippet: window.code,
      codeSnippetStartLine: window.startLine,
    };
  } catch (error) {
    // File not found or unreadable — not an error, just can't provide context
    logger.scan.debug('resolveCodeContext: could not read file', { filePath, error: (error as Error).message });
    return null;
  }
}

/**
 * Batch resolve code contexts for multiple findings in the same repository.
 * More efficient than calling resolveCodeContext individually.
 *
 * @param repoDir - Root directory of the cloned repository
 * @param findings - Array of { filePath, lineNumber } objects
 * @returns Map of filePath:lineNumber -> code context
 */
export async function resolveCodeContextsBatch(
  repoDir: string,
  findings: Array<{ filePath: string; lineNumber: number }>,
): Promise<Map<string, { codeSnippet: string; codeSnippetStartLine: number }>> {
  const results = new Map<string, { codeSnippet: string; codeSnippetStartLine: number }>();

  // Group by file to minimize file reads
  const byFile = new Map<string, number[]>();
  for (const f of findings) {
    const key = f.filePath;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(f.lineNumber);
  }

  // Read each file once and extract contexts for all findings in that file
  for (const [filePath, lineNumbers] of byFile) {
    try {
      let absolutePath = filePath;
      if (!path.isAbsolute(filePath)) {
        absolutePath = path.join(repoDir, filePath);
      }

      const content = await readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      for (const lineNum of lineNumbers) {
        if (lineNum < 1 || lineNum > lines.length) continue;

        const funcContext = tryExtractEnclosingFunction(lines, lineNum);
        if (funcContext && funcContext.code.split('\n').length <= MAX_SNIPPET_LINES) {
          results.set(`${filePath}:${lineNum}`, {
            codeSnippet: funcContext.code,
            codeSnippetStartLine: funcContext.startLine,
          });
        } else {
          const window = extractLineWindow(lines, lineNum);
          results.set(`${filePath}:${lineNum}`, {
            codeSnippet: window.code,
            codeSnippetStartLine: window.startLine,
          });
        }
      }
    } catch {
      // File not readable — skip
    }
  }

  return results;
}
