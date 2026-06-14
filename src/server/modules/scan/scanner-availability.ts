/**
 * Scanner availability checker.
 * 
 * This module provides functions to check whether scanner binaries are installed
 * and accessible on the host system. It uses platform-aware commands (`where` on
 * Windows, `which` on Linux/Mac) and caches results in memory to avoid repeated
 * subprocess calls.
 * 
 * Platform-specific considerations:
 * - Windows: Checks common installation paths (LLVM, scoop, MSYS2)
 * - Linux/Mac: Uses `which` command
 * - Results are cached per scanner ID to minimize overhead
 * 
 * @module scan/scanner-availability
 * 
 * @example
 * ```ts
 * import { checkScannerAvailability, getAvailableScanners } from './scanner-availability';
 * 
 * // Check single scanner
 * const isAvailable = await checkScannerAvailability('semgrep');
 * 
 * // Get all available scanners (uses cache)
 * const available = getAvailableScanners();
 * console.log('Available scanners:', available);
 * ```
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logger } from '@/server/lib/logger';
import { SCANNER_COMMANDS } from './scanners';
import type { ScannerId } from './constants';

/** In-memory cache mapping scanner ID to availability result. */
const availabilityCache = new Map<ScannerId, boolean>();

/** Common installation paths for scanners on Windows */
const WINDOWS_SCANNER_PATHS: Record<string, string[]> = {
  'clang-tidy': [
    'C:\\Program Files\\LLVM\\bin\\clang-tidy.exe',
    'C:\\Program Files (x86)\\LLVM\\bin\\clang-tidy.exe',
  ],
  'clang': [
    'C:\\Program Files\\LLVM\\bin\\clang.exe',
    'C:\\Program Files (x86)\\LLVM\\bin\\clang.exe',
  ],
  'gcc': [
    'C:\\Users\\Rezork\\scoop\\apps\\gcc\\current\\bin\\gcc.exe',
    'C:\\msys64\\mingw64\\bin\\gcc.exe',
    'C:\\mingw64\\bin\\gcc.exe',
  ],
};

/**
 * Return the platform-appropriate command for checking binary existence.
 * Uses `where` on Windows, `which` on Linux/Mac.
 */
function getLookupCommand(): string {
  return process.platform === 'win32' ? 'where' : 'which';
}

/**
 * Check if a scanner binary is available and reachable.
 *
 * @param scanner - The scanner identifier to check.
 * @returns `true` if the scanner responds to `--version` without error.
 */
export async function checkScannerAvailability(scanner: ScannerId): Promise<boolean> {
  logger.scan.debug('checkScannerAvailability', { scanner });

  const cfg = SCANNER_COMMANDS[scanner];
  if (!cfg) {
    logger.scan.debug('checkScannerAvailability completed', { scanner, available: false });
    return false;
  }

  // Check common paths first (faster than subprocess)
  const command = cfg.command;
  const commonPaths = WINDOWS_SCANNER_PATHS[command] || [];
  for (const p of commonPaths) {
    if (existsSync(p)) {
      availabilityCache.set(scanner, true);
      logger.scan.debug('checkScannerAvailability completed', { scanner, available: true, path: p });
      return true;
    }
  }

  // Fall back to `where`/`which` command
  const lookupCmd = getLookupCommand();
  const available = await new Promise<boolean>((resolve) => {
    execFile(lookupCmd, [command], { timeout: 5_000, shell: true }, (error) => {
      resolve(!error);
    });
  });

  availabilityCache.set(scanner, available);
  logger.scan.debug('checkScannerAvailability completed', { scanner, available });
  return available;
}

/**
 * Check availability for all configured scanners.
 *
 * @returns A map from scanner ID to availability boolean.
 */
export async function checkAllScannerAvailability(): Promise<Record<ScannerId, boolean>> {
  const scanners = Object.keys(SCANNER_COMMANDS) as ScannerId[];
  const results = await Promise.all(scanners.map(checkScannerAvailability));

  return Object.fromEntries(scanners.map((s, i) => [s, results[i]])) as Record<ScannerId, boolean>;
}

/**
 * Clear the in-memory availability cache.
 * Useful after installing a new scanner or during testing.
 */
export function clearAvailabilityCache(): void {
  availabilityCache.clear();
  logger.scan.debug('clearAvailabilityCache completed');
}

/**
 * Return the cached availability result for a scanner without re-checking.
 *
 * @param scanner - The scanner identifier to look up.
 * @returns The cached boolean, or `undefined` if not yet checked.
 */
export function getCachedAvailability(scanner: ScannerId): boolean | undefined {
  return availabilityCache.get(scanner);
}

/**
 * Return all scanners that are currently cached as available.
 *
 * @returns Array of scanner IDs that are available.
 */
export function getAvailableScanners(): ScannerId[] {
  const available: ScannerId[] = [];
  for (const [scanner, isAvailable] of availabilityCache) {
    if (isAvailable) available.push(scanner);
  }
  return available;
}
