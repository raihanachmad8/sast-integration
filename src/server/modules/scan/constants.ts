/**
 * Scan module constants.
 * All magic numbers, job names, and default values are defined here
 * to avoid hardcoding throughout the codebase.
 */

/** Maximum total size for synchronous upload payload (50MB) */
export const MAX_UPLOAD_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;

/** Threshold above which uploaded scan results are processed asynchronously via queue */
export const ASYNC_PARSE_THRESHOLD_BYTES = 5 * 1024 * 1024;

import { QUEUE_JOBS, QUEUE_DEFAULT_RETRY_LIMIT } from '@/commons/constants/queue';

/** Name of the background job that parses uploaded scanner results */
export const SCAN_PARSE_JOB_NAME = QUEUE_JOBS.PARSE_SCAN_RESULT;

/** Default number of retry attempts for parse jobs */
export const SCAN_PARSE_JOB_RETRY_LIMIT = QUEUE_DEFAULT_RETRY_LIMIT;

/** Supported scanner types (for validation and documentation) */
export const SUPPORTED_SCANNERS = [
  'semgrep',
  'cppcheck',
  'gitleaks',
  'trivy',
  'flawfinder',
  'sarif',
] as const;

export type SupportedScanner = (typeof SUPPORTED_SCANNERS)[number];

/** Default severity when mapping is unknown */
export const DEFAULT_SEVERITY = 'medium' as const;

/** Default retention period for raw scan report files in object storage (days) */
export const RETENTION_DAYS = 30;

/** Default title max length when generating finding group titles from fingerprints */
export const FINDING_TITLE_FINGERPRINT_MAX_LENGTH = 40;

/** Default title max length when using finding message as group title */
export const FINDING_TITLE_MESSAGE_MAX_LENGTH = 80;

/** Max message length used for fingerprint hash input (controls deduplication sensitivity) */
export const FINGERPRINT_MESSAGE_MAX_LENGTH = 180;

/** Max characters of secret match shown in gitleaks finding descriptions */
export const GITLEAKS_MATCH_PREVIEW_MAX_LENGTH = 50;

/**
 * Validates that a list of scanner names are all in the supported list.
 * Used by upload endpoint and (future) managed scan_policies.
 */
export function validateScanners(scanners: string[]): {
  valid: boolean;
  unsupported: string[];
} {
  const unsupported = scanners.filter(
    (s) => !SUPPORTED_SCANNERS.includes(s as SupportedScanner)
  );
  return {
    valid: unsupported.length === 0,
    unsupported,
  };
}

/**
 * Human-readable labels for scanner types (used in UI / responses).
 */
export const SCANNER_LABELS: Record<SupportedScanner, string> = {
  semgrep: 'Semgrep',
  cppcheck: 'Cppcheck',
  gitleaks: 'Gitleaks',
  trivy: 'Trivy',
  flawfinder: 'Flawfinder',
  sarif: 'SARIF',
};

/**
 * Default message shown to users when raw scan files will be retained.
 */
export const DEFAULT_RETENTION_NOTE =
  'Raw scan files will be retained for 30 days by default.';

/**
 * Job names used by the background queue system (scan related).
 */
export const QUEUE_JOB_NAMES = {
  PARSE_SCAN_RESULT: QUEUE_JOBS.PARSE_SCAN_RESULT,
  CLEANUP_OLD_SCAN_FILES: 'cleanup-old-scan-files',
  RUN_MANAGED_SCAN: 'run-managed-scan',
  TRIGGER_SCHEDULED_MANAGED_SCAN: 'trigger-scheduled-managed-scan',
  AI_VERIFY_FINDING: QUEUE_JOBS.AI_VERIFY_FINDING,
} as const;

/**
 * Discriminated origins for scans.
 * - 'managed': Triggered by the platform itself (SCM checkout + scanner execution per policy)
 * - 'external_upload': Results uploaded directly from CI/CD pipelines (no SCM execution)
 *
 * This is the single source of truth. Used in DB (scan_results.origin), UI badges,
 * audit logs, and filtering logic. Never hardcode the string values elsewhere.
 */
export const SCAN_ORIGINS = {
  MANAGED: 'managed',
  EXTERNAL_UPLOAD: 'external_upload',
} as const;

export type ScanOrigin = typeof SCAN_ORIGINS[keyof typeof SCAN_ORIGINS];
