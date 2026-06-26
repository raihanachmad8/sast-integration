import crypto from 'node:crypto';
import { normalizeFilePath } from '../parsers/path-normalizer';
import { logger } from '@/server/lib/logger';

/**
 * Generates a stable, deterministic fingerprint for a finding.
 *
 * This fingerprint is the core of the deduplication strategy using `finding_groups`.
 * The algorithm deliberately ignores minor variations so that the same vulnerability
 * is grouped across commits, branches, and slight refactors.
 *
 * Components (joined by `||`):
 * 1. Scanner name (semgrep, flawfinder, etc.)
 * 2. Rule ID (e.g. semgrep check_id, flawfinder rule)
 * 3. Normalized file path (relative to repo root, no temp dirs)
 * 4. Full message (no truncation)
 *
 * Deliberately excluded:
 * - Line number: survives code movement (like Semgrep's match_based_id)
 *
 * @param input.scanner - Scanner name (e.g. 'semgrep', 'flawfinder')
 * @param input.rule - The scanner rule ID
 * @param input.filePath - File path (will be normalized to repo-relative)
 * @param input.message - Human-readable message (full, no truncation)
 * @returns 64-character lowercase hex string
 */
export function generateFindingFingerprint(input: {
  scanner: string;
  rule: string;
  filePath?: string | null;
  message?: string | null;
}): string {
  const normalized = [
    input.scanner?.trim() || '',
    input.rule?.trim() || '',
    normalizeFilePath(input.filePath?.trim() || ''),
    (input.message || '').trim(),
  ].join('||');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}
