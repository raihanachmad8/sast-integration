/**
 * Normalize file path to be relative to repository root.
 *
 * Strips:
 * - Temp dir prefixes: /tmp/sast-managed-XXXX/repo/file.c → file.c
 * - CWD prefixes: C:\Users\...\repo\file.c → file.c
 * - Relative ./ prefixes: ./src/app.py → src/app.py
 *
 * Normalizes:
 * - Backslashes to forward slashes
 */
export function normalizeFilePath(filePath: string): string {
  if (!filePath) return '';

  // Pattern: .../repo/... → ambil setelah /repo/
  const repoMatch = filePath.match(/[/\\]repo[/\\](.+)/i);
  if (repoMatch) return repoMatch[1].replace(/\\/g, '/');

  // Strip ./
  if (filePath.startsWith('./')) return filePath.slice(2);

  // Normalize backslashes
  return filePath.replace(/\\/g, '/');
}
