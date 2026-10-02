/**
 * High-level constants related to the Scan / SAST upload system.
 *
 * These constants are intended to be used across multiple modules
 * (API routes, services, jobs, etc.) so that behavior is consistent.
 *
 * @example
 * ```tsx
 * // Check if scanners are valid
 * import { validateScanners, SUPPORTED_SCANNERS } from '@/commons/constants/scan';
 *
 * const isValid = validateScanners(['semgrep', 'gitleaks']);  // true
 * const isInvalid = validateScanners(['invalid-scanner']);     // false
 *
 * // Check repository connection type
 * import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';
 *
 * if (repo.connection_type === REPOSITORY_CONNECTION_TYPES.SCM) {
 *   // SCM-connected repository
 * }
 *
 * // Check scan origin
 * import { SCAN_ORIGINS } from '@/commons/constants/scan';
 *
 * if (scan.origin === SCAN_ORIGINS.MANAGED) {
 *   // Platform-triggered scan
 * }
 * ```
 */

import {
  MAX_UPLOAD_TOTAL_SIZE_BYTES,
  ASYNC_PARSE_THRESHOLD_BYTES,
  SUPPORTED_SCANNERS,
  type SupportedScanner,
  RETENTION_DAYS,
  validateScanners,
  SCANNER_LABELS,
  DEFAULT_RETENTION_NOTE,
  QUEUE_JOB_NAMES,
} from '@/server/modules/scan/constants';

import { QUEUE_JOBS } from './queue';

/**
 * Re-exported core scan constants for cross-module usage.
 * All authoritative definitions live in @/server/modules/scan/constants.
 */
export {
  MAX_UPLOAD_TOTAL_SIZE_BYTES,
  ASYNC_PARSE_THRESHOLD_BYTES,
  SUPPORTED_SCANNERS,
  type SupportedScanner,
  RETENTION_DAYS,
  validateScanners,
  SCANNER_LABELS,
  DEFAULT_RETENTION_NOTE,
  QUEUE_JOB_NAMES,
};

/**
 * Repository connection types — distinguishes SCM-connected from external upload repos.
 *
 * @example
 * ```tsx
 * import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';
 *
 * // SCM-connected repo (GitHub, GitLab, Gitea)
 * if (repo.connection_type === REPOSITORY_CONNECTION_TYPES.SCM) {
 *   // Can trigger managed scans
 * }
 *
 * // External upload repo (CI pipeline uploads)
 * if (repo.connection_type === REPOSITORY_CONNECTION_TYPES.EXTERNAL) {
 *   // Results-only, no SCM integration
 * }
 * ```
 */
export {
  REPOSITORY_CONNECTION_TYPES,
  type RepositoryConnectionType,
} from '@/server/modules/project/constants';

/**
 * Scan origin discriminators — identifies how a scan was triggered.
 *
 * @example
 * ```tsx
 * import { SCAN_ORIGINS } from '@/commons/constants/scan';
 *
 * if (scan.origin === SCAN_ORIGINS.MANAGED) {
 *   // Platform-triggered scan (webhook, schedule, manual)
 * } else if (scan.origin === SCAN_ORIGINS.EXTERNAL_UPLOAD) {
 *   // CI pipeline uploaded results
 * }
 * ```
 */
export {
  SCAN_ORIGINS,
  type ScanOrigin,
} from '@/server/modules/scan/constants';

/**
 * Convenience alias for the parse-scan-result queue job name.
 *
 * @example
 * ```tsx
 * import { SCAN_PARSE_JOB_NAME } from '@/commons/constants/scan';
 *
 * await enqueue(SCAN_PARSE_JOB_NAME, { scanId, scanResultId });
 * ```
 */
export const SCAN_PARSE_JOB_NAME = QUEUE_JOBS.PARSE_SCAN_RESULT;
