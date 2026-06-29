/**
 * Scan module constants.
 * 
 * This module defines all magic numbers, job names, scanner identifiers,
 * and default values used throughout the scan pipeline. Centralizing these
 * constants ensures consistency and makes configuration changes straightforward.
 * 
 * @module scan/constants
 * 
 * @example
 * ```ts
 * import { SUPPORTED_SCANNERS, validateScanners } from './constants';
 * 
 * const { valid, unsupported } = validateScanners(['semgrep', 'unknown']);
 * // valid: false, unsupported: ['unknown']
 * ```
 */

import { QUEUE_JOBS } from '@/commons/constants/queue';

/** Maximum total size for synchronous upload payload (50MB). */
export const MAX_UPLOAD_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;

/** Threshold above which uploaded scan results are processed asynchronously via queue (5MB). */
export const ASYNC_PARSE_THRESHOLD_BYTES = 5 * 1024 * 1024;

/** Name of the background job that parses uploaded scanner results. */
export const SCAN_PARSE_JOB_NAME = QUEUE_JOBS.PARSE_SCAN_RESULT;

/** Supported scanner identifiers. */
export const SUPPORTED_SCANNERS = [
  'semgrep',
  'cppcheck',
  'gitleaks',
  'flawfinder',
  'clang-tidy',
  'gcc-fanalyzer',
] as const;

export type ScannerId = (typeof SUPPORTED_SCANNERS)[number];

/** Human-readable labels for each scanner. */
export const SCANNER_LABELS: Record<ScannerId, string> = {
  semgrep: 'Semgrep',
  cppcheck: 'Cppcheck',
  gitleaks: 'Gitleaks',
  flawfinder: 'Flawfinder',
  'clang-tidy': 'Clang-Tidy',
  'gcc-fanalyzer': 'GCC -fanalyzer',
};

/** Default severity level for findings. */
export const DEFAULT_SEVERITY = 'medium';

/** Number of days to retain scan results. */
export const RETENTION_DAYS = 30;

/** Default note attached to retained scans. */
export const DEFAULT_RETENTION_NOTE = 'Retained per workspace policy';

/** Origins that can trigger a scan. */
export const SCAN_ORIGINS = {
  MANAGED: 'managed',
  EXTERNAL_UPLOAD: 'external_upload',
} as const;

export type ScanOrigin = (typeof SCAN_ORIGINS)[keyof typeof SCAN_ORIGINS];

/** Queue job names for the scan pipeline. */
export const QUEUE_JOB_NAMES = {
  SCAN_START: 'scan:start',
  SCAN_COMPLETE: 'scan:complete',
  SCAN_FAIL: 'scan:fail',
  FINDING_INGEST: 'finding:ingest',
  RUN_MANAGED_SCAN: QUEUE_JOBS.RUN_MANAGED_SCAN,
  TRIGGER_SCHEDULED_MANAGED_SCAN: QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN,
} as const;

/** Default title max length when generating finding group titles from fingerprints. */
export const FINDING_TITLE_FINGERPRINT_MAX_LENGTH = 40;

/** Default title max length when using finding message as group title. */
export const FINDING_TITLE_MESSAGE_MAX_LENGTH = 80;

/** Default branch used when triggering managed scans. */
export const DEFAULT_MANAGED_SCAN_BRANCH = 'main';

/** Default scanners used when no profile is specified. */
export const DEFAULT_SCANNERS: readonly string[] = ['semgrep', 'cppcheck', 'clang-tidy', 'gcc-fanalyzer', 'flawfinder', 'gitleaks'];

/** Default cron expression for scheduled managed scans (daily at 03:00 UTC). */
export const DEFAULT_MANAGED_SCAN_CRON = '0 3 * * *';

/** Maximum output buffer size per scanner invocation (20MB). */
/** Maximum buffer size for scanner output (50MB, ported from legacy). */
export const MAX_SCANNER_OUTPUT_BUFFER_BYTES = 50 * 1024 * 1024;

/** Max length for Gitleaks match preview in finding descriptions. */
export const GITLEAKS_MATCH_PREVIEW_MAX_LENGTH = 120;

/**
 * Validate an array of scanner names against the supported set.
 *
 * @param scanners - Raw scanner name strings to validate
 * @returns Object with `valid` flag and list of unsupported scanner names
 */
export function validateScanners(scanners: string[]): { valid: boolean; unsupported: string[] } {
  const unsupported = scanners.filter(s => !SUPPORTED_SCANNERS.includes(s as ScannerId));
  return { valid: unsupported.length === 0, unsupported };
}

/** Module-specific error constants. */
export const SCAN = {
  ERRORS: {
    NOT_FOUND: 'Scan not found',
    NOT_FOUND_CODE: 'SCAN_NOT_FOUND',
    FORBIDDEN: 'Not a workspace member',
    FORBIDDEN_CODE: 'SCAN_FORBIDDEN',
    INVALID_SCANNERS: 'Unsupported scanner(s)',
    INVALID_SCANNERS_CODE: 'INVALID_SCANNERS',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_REPOSITORY_TYPE_FOR_MANAGED_SCAN: 'INVALID_REPOSITORY_TYPE_FOR_MANAGED_SCAN',
    SCAN_POLICY_REQUIRED: 'SCAN_POLICY_REQUIRED',
    SCAN_POLICY_NOT_FOUND: 'SCAN_POLICY_NOT_FOUND',
    SCAN_POLICY_INVALID: 'SCAN_POLICY_INVALID',
    AI_MODEL_NOT_CONFIGURED: 'AI_MODEL_NOT_CONFIGURED',
  },
} as const;
