/**
 * Scanner execution configuration for Managed Scan Engine.
 *
 * This module centralizes all definitions related to which scanners the platform
 * can run natively during managed (SCM) scans, including the exact CLI commands,
 * arguments, output format, and how to read their output.
 *
 * This is the single source of truth for "what the platform can execute itself".
 * External uploads can still send results from any scanner (as long as it's in SUPPORTED_SCANNERS),
 * but only the scanners defined here can be triggered automatically by the platform.
 */

import { type SupportedScanner } from './constants';

export interface ScannerCommandConfig {
  /** The executable name (must be available in PATH on the host running the worker) */
  command: string;
  /** Function that returns the arguments for a given target directory */
  args: (targetDir: string) => string[];
  /** Expected output format (used for storage content-type and later parsing) */
  format: 'json' | 'xml' | 'text' | 'sarif';
  /** Some tools (like cppcheck) write useful output to stderr instead of stdout */
  outputStream?: 'stdout' | 'stderr';
}

/**
 * Centralized configuration for all natively supported scanners in managed execution.
 *
 * Important notes for operations:
 * - These CLI tools must be installed on the machine that runs the queue workers.
 * - Versions should be pinned in production environments for reproducibility.
 * - Adding a new scanner here requires:
 *     1. Adding it to SUPPORTED_SCANNERS (if not already there)
 *     2. Updating this map
 *     3. Ensuring the parser can handle the output format
 */
export const SCANNER_COMMANDS: Record<SupportedScanner, ScannerCommandConfig> = {
  semgrep: {
    command: 'semgrep',
    args: (targetDir) => ['--config', 'auto', '--json', targetDir],
    format: 'json',
  },
  gitleaks: {
    command: 'gitleaks',
    args: (targetDir) => ['detect', '--source', targetDir, '--report-format', 'json', '--no-banner'],
    format: 'json',
  },
  trivy: {
    command: 'trivy',
    args: (targetDir) => ['fs', '--format', 'json', targetDir],
    format: 'json',
  },
  cppcheck: {
    command: 'cppcheck',
    args: (targetDir) => ['--xml', '--enable=all', targetDir],
    format: 'xml',
    outputStream: 'stderr',
  },
  flawfinder: {
    command: 'flawfinder',
    args: (targetDir) => ['--dataonly', '--quiet', targetDir],
    format: 'text',
  },
  sarif: {
    // We reuse semgrep with --sarif output for basic SARIF support in managed mode
    command: 'semgrep',
    args: (targetDir) => ['--config', 'auto', '--sarif', targetDir],
    format: 'sarif',
  },
} as const;

/** Default timeout for individual scanner execution (in seconds) */
export const DEFAULT_SCANNER_TIMEOUT_SECONDS = 300;

/** Default git clone depth for managed scans (shallow clone for speed) */
export const DEFAULT_GIT_CLONE_DEPTH = 1;

/** Maximum buffer size for scanner stdout/stderr (20MB) */
export const MAX_SCANNER_OUTPUT_BUFFER_BYTES = 20 * 1024 * 1024;

/** Default branch used for managed scans when none is specified */
export const DEFAULT_MANAGED_SCAN_BRANCH = 'main';

/** Default cron expression for daily scheduled managed scans (03:00 UTC) */
export const DEFAULT_MANAGED_SCAN_CRON = '0 3 * * *';
