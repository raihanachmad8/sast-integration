/**
 * Scanner command configuration and definitions.
 * 
 * This module defines the CLI invocation patterns for all supported SAST scanners.
 * Each scanner entry maps a scanner ID to the shell command, arguments, output format,
 * and environment variables required to run it correctly.
 * 
 * Environment variables and CLI flags are ported from the legacy codebase to ensure
 * cross-platform compatibility (especially Windows) and prevent common issues like:
 * - Windows Unicode encoding errors (Python UTF-8 mode for semgrep)
 * - Network requests during offline scans (metrics/version-check disabled)
 * - Filesystem-only scanning (no-git for gitleaks on cloned repos)
 * 
 * Rules directories are configurable via env vars:
 * - SEMGREP_RULES_DIR: Local semgrep rules directory (default: ./rules/semgrep)
 * - GITLEAKS_CONFIG_PATH: Custom gitleaks rules file
 * - FLAWFINDER_RULES_DIR: Custom flawfinder rules directory
 * - CPPCHECK_SUPPRESSIONS_PATH: Cppcheck suppressions file
 * 
 * @module scan/scanners
 * 
 * @example
 * ```ts
 * import { SCANNER_COMMANDS } from './scanners';
 * 
 * const cfg = SCANNER_COMMANDS.semgrep;
 * const args = cfg.args(targetDir);
 * // Execute: semgrep scan --json --metrics=off --config p/default /path/to/repo
 * ```
 */

import type { ScannerId } from './constants';
import path from 'node:path';
import { readdirSync } from 'node:fs';
import { env } from '@/server/env';

/** Resolved path to the local semgrep rules directory. Uses forward slashes for cross-platform compatibility with semgrep CLI. */
const SEMGREP_RULES_DIR = env.SEMGREP_RULES_DIR ?? '';

/** Configuration for a single scanner's CLI command. */
export interface ScannerCommandConfig {
  /** The executable or wrapper command. */
  command: string;
  /** Function that returns default arguments for a given target directory. */
  args: (targetDir: string) => string[];
  /** Output format produced by the scanner. */
  format: 'sarif' | 'json' | 'xml' | 'text';
  /** Optional output stream file path for scanners that write to file. */
  outputStream?: string;
  /** Optional environment variables to merge with process.env for the scanner. */
  env?: Record<string, string>;
}

/** Default timeout applied when a scanner entry omits `timeoutSeconds`. */
export const DEFAULT_SCANNER_TIMEOUT_SECONDS = 300;

/** Default git clone depth used when a scan requires a fresh clone. */
export const DEFAULT_GIT_CLONE_DEPTH = 1;

/** Maximum git clone depth. */
export const MAX_GIT_CLONE_DEPTH = 100;

/** Default concurrent scan limit per workspace. */
export const DEFAULT_CONCURRENT_SCAN_LIMIT = 3;

/**
 * Registry of supported scanner CLI configurations.
 *
 * Environment variables and flags are ported from the legacy codebase to fix:
 * - Windows Unicode encoding errors (Python UTF-8 mode for semgrep)
 * - Network requests during offline scans (metrics/version-check disabled)
 * - Filesystem-only scanning (no-git for gitleaks on cloned repos)
 *
 * @example
 * ```ts
 * const cfg = SCANNER_COMMANDS.semgrep;
 * const args = cfg.args(targetDir);
 * execSync(`${cfg.command} ${args.join(' ')} --sarif -o results.sarif`);
 * ```
 */
export const SCANNER_COMMANDS: Record<ScannerId, ScannerCommandConfig> = {
  /**
   * Semgrep — pattern-matching SAST scanner.
   *
   * Environment variables (ported from legacy):
   * - PYTHONUTF8=1: Activates Python UTF-8 mode (PEP 540) to prevent
   *   UnicodeEncodeError on Windows when semgrep downloads registry rules
   *   containing characters outside cp1252.
   * - PYTHONIOENCODING=utf-8: Reinforces UTF-8 for explicit stream operations.
   * - PYTHONLEGACYWINDOWSSTDIO=0: Uses new-style UTF-8 stdio on Windows.
   * - SEMGREP_SEND_METRICS=off: Prevents network requests for metrics.
   * - SEMGREP_ENABLE_VERSION_CHECK=0 / SEMGREP_DISABLE_VERSION_CHECK=1:
   *   Suppresses version-check HTTP call.
   *
   * CLI flags (ported from legacy):
   * - --metrics=off: Prevents network request to semgrep.dev for metrics.
   * - --disable-version-check: Suppresses version-check HTTP call.
   * - --no-git-ignore: Scans filesystem directly (not just git-tracked files).
   * - --skip-unknown-extensions: Silently skips unrecognized file extensions.
   */
  semgrep: {
    command: 'semgrep',
    args: (targetDir) => {
      const args = [
        'scan',
        '--json',
        '--metrics=off',
        '--disable-version-check',
        '--no-git-ignore',
        '--skip-unknown-extensions',
      ];
      // Use custom rules dir if set, otherwise use p/default + p/security-audit
      if (SEMGREP_RULES_DIR) {
        args.push('--config', SEMGREP_RULES_DIR.split(path.sep).join('/'));
      } else {
        args.push('--config', 'p/default');
        args.push('--config', 'p/security-audit');
      }
      args.push(targetDir);
      return args;
    },
    format: 'json',
    env: {
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONLEGACYWINDOWSSTDIO: '0',
      SEMGREP_SEND_METRICS: 'off',
      SEMGREP_ENABLE_VERSION_CHECK: '0',
      SEMGREP_DISABLE_VERSION_CHECK: '1',
    },
  },
  cppcheck: {
    command: 'cppcheck',
    args: (targetDir) => {
      const args = ['--enable=warning,style,performance,portability,information', '--force', '--quiet', '--xml', '--xml-version=2'];
      if (env.CPPCHECK_SUPPRESSIONS_PATH) args.push('--suppressions-list', env.CPPCHECK_SUPPRESSIONS_PATH);
      args.push('.');
      return args;
    },
    format: 'xml',
    outputStream: 'results.xml',
  },
  /**
   * Gitleaks — secrets detection scanner.
   *
   * Flags (ported from legacy):
   * - --no-git: Scans filesystem directly instead of requiring git history.
   *   Since we clone the repo with --depth 1, git history is incomplete.
   *   Scanning the filesystem directly ensures all files are checked.
   *
   * Exit code handling:
   * - Exit code 1 means "leaks found" (expected behavior, not an error).
   * - The SARIF report is written to --report-path file, not stdout.
   */
  gitleaks: {
    command: 'gitleaks',
    args: (targetDir) => {
      const args = [
        'detect',
        '--source', targetDir,
        '--report-format', 'json',
        '--report-path', path.join(targetDir, 'results.json'),
        '--no-git',
      ];
      if (env.GITLEAKS_CONFIG_PATH) args.push('--config', env.GITLEAKS_CONFIG_PATH);
      return args;
    },
    format: 'json',
    outputStream: 'results.json',
  },
  flawfinder: {
    command: 'flawfinder',
    args: (targetDir) => {
      const args: string[] = ['--sarif', '--columns'];
      if (env.FLAWFINDER_RULES_DIR) args.push('--rulesdir', env.FLAWFINDER_RULES_DIR);
      args.push(targetDir);
      return args;
    },
    format: 'json',
  },
  /**
   * Clang-Tidy — clang-based linter with static analysis checks.
   *
   * Runs clang-analyzer, cert, bugprone, and security checks.
   * Output format: raw text (parsed by clang-tidy parser).
   * On Windows, may need GCC include paths for system headers.
   */
  'clang-tidy': {
    command: 'clang-tidy',
    args: (targetDir) => {
      const files = readdirSync(targetDir)
        .filter((f) => /\.(c|cpp|h|hpp)$/i.test(f))
        .filter((f) => !f.includes('dummy'))
        .map((f) => `${targetDir}/${f}`);

      // Get GCC include paths for system headers
      const extraArgs: string[] = [];
      try {
        const { execSync } = require('node:child_process');
        const dummyPath = `${targetDir}/__dummy.c`;
        require('node:fs').writeFileSync(dummyPath, '#include <stdio.h>\n');
        const output = execSync(`gcc -v -E "${dummyPath}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        const lines = output.split('\n');
        let inSearch = false;
        for (const line of lines) {
          if (line.includes('search starts here')) { inSearch = true; continue; }
          if (inSearch) {
            const m = line.match(/^\s+(.+)/);
            if (m && require('node:fs').existsSync(m[1].trim())) {
              extraArgs.push(`--extra-arg=-I${m[1].trim()}`);
            }
          }
        }
        require('node:fs').unlinkSync(dummyPath);
      } catch { /* ignore errors */ }

      return [
        '--checks=-*,clang-analyzer-*,cert-*,bugprone-*,security-*',
        '--warnings-as-errors=-*',
        ...extraArgs,
        ...files,
      ];
    },
    format: 'text',
  },
  /**
   * GCC -fanalyzer — GCC's built-in static analysis.
   *
   * Produces detailed warnings with flow traces.
   * SARIF output may not work on Windows; text output is reliable.
   */
  'gcc-fanalyzer': {
    command: 'gcc',
    args: (targetDir) => {
      const files = readdirSync(targetDir)
        .filter((f) => /\.(c|cpp|h|hpp)$/i.test(f))
        .map((f) => `${targetDir}/${f}`);
      return [
        '-fanalyzer',
        '-Wall',
        ...files,
        '-c',
      ];
    },
    format: 'text',
  },
};

