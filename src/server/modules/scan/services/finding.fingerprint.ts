import crypto from 'node:crypto';
import { FINGERPRINT_MESSAGE_MAX_LENGTH } from '../constants';

/**
 * Generates a stable, deterministic fingerprint for a finding.
 *
 * This fingerprint is the core of the deduplication strategy using `finding_groups`.
 * The algorithm deliberately ignores minor variations so that the same vulnerability
 * is grouped across commits, branches, and slight refactors.
 *
 * @param input.rule - The scanner rule ID (e.g. semgrep rule or Trivy CVE)
 * @param input.filePath - Relative file path where the issue was found
 * @param input.lineNumber - Line number (can be null for some scanners)
 * @param input.message - Human-readable message or title
 * @returns 64-character lowercase hex string
 */
export function generateFindingFingerprint(input: {
  rule: string;
  filePath?: string | null;
  lineNumber?: number | null;
  message?: string | null;
}): string {
  const normalized = [
    input.rule?.trim() || '',
    input.filePath?.trim() || '',
    input.lineNumber ?? '',
    (input.message || '').trim().slice(0, FINGERPRINT_MESSAGE_MAX_LENGTH),
  ].join('||');

  return crypto.createHash('sha256').update(normalized).digest('hex');
}
