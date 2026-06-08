/**
 * High-level constants related to the Scan / SAST upload system.
 *
 * @example
 * ```tsx
 * import { validateScanners, SUPPORTED_SCANNERS } from '@/commons/constants/scan';
 * const isValid = validateScanners(['semgrep', 'gitleaks']);
 * ```
 */

export const SUPPORTED_SCANNERS = ['semgrep', 'gitleaks', 'cppcheck'] as const;
export type SupportedScanner = (typeof SUPPORTED_SCANNERS)[number];

export const SCANNER_LABELS: Record<SupportedScanner, string> = {
  semgrep: 'Semgrep',
  gitleaks: 'Gitleaks',
  cppcheck: 'Cppcheck',
};

export const MAX_UPLOAD_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;
export const ASYNC_PARSE_THRESHOLD_BYTES = 1024 * 1024;
export const RETENTION_DAYS = 90;
export const DEFAULT_RETENTION_NOTE = 'Findings are retained for 90 days by default.';

export function validateScanners(scanners: string[]): boolean {
  return scanners.every((s) => (SUPPORTED_SCANNERS as readonly string[]).includes(s));
}

export const REPOSITORY_CONNECTION_TYPES = { SCM: 'scm', EXTERNAL: 'external' } as const;

export const SCAN_ORIGINS = { MANAGED: 'managed', EXTERNAL_UPLOAD: 'external_upload' } as const;

export const QUEUE_JOB_NAMES = { PARSE_SCAN_RESULT: 'parse-scan-result' } as const;

export const SCAN_PARSE_JOB_NAME = QUEUE_JOB_NAMES.PARSE_SCAN_RESULT;
