/**
 * Scanner binary availability checker.
 *
 * Detects whether scanner CLI binaries are installed on the host system.
 * Handles cross-platform differences:
 * - Windows: uses `where` command to search PATH
 * - Linux/Mac: uses `which` command to search PATH
 *
 * Results are cached in-memory to avoid repeated filesystem checks.
 * Call `clearAvailabilityCache()` to force re-check after installing/uninstalling scanners.
 *
 * @module scanner-availability
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { SupportedScanner } from './constants';
import { SCANNER_COMMANDS } from './scanners';

const execFileAsync = promisify(execFile);

// Cache: scanner → availability (null = not checked yet)
const availabilityCache = new Map<SupportedScanner, boolean | null>();

/**
 * Check if a single scanner binary is available on the system.
 *
 * Uses platform-specific commands:
 * - Windows: `where <binary>` (searches PATH for .exe/.cmd/.bat)
 * - Linux/Mac: `which <binary>` (searches PATH for executable)
 *
 * @param scanner - The scanner to check
 * @returns true if binary is found and executable
 *
 * @example
 * ```ts
 * const isAvailable = await checkScannerAvailability('semgrep');
 * if (!isAvailable) {
 *   console.warn('semgrep is not installed');
 * }
 * ```
 */
export async function checkScannerAvailability(
  scanner: SupportedScanner
): Promise<boolean> {
  // Check cache first
  const cached = availabilityCache.get(scanner);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const config = SCANNER_COMMANDS[scanner];
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      // Windows: use 'where' command to search PATH
      await execFileAsync('where', [config.command]);
    } else {
      // Linux/Mac: use 'which' command to search PATH
      await execFileAsync('which', [config.command]);
    }

    availabilityCache.set(scanner, true);
    return true;
  } catch {
    // Binary not found in PATH
    availabilityCache.set(scanner, false);
    return false;
  }
}

/**
 * Check availability of all supported scanners.
 * Returns a record mapping each scanner to its availability status.
 *
 * @returns Record of scanner → availability
 *
 * @example
 * ```ts
 * const availability = await checkAllScanners();
 * // { semgrep: true, gitleaks: false, trivy: true, ... }
 * ```
 */
export async function checkAllScanners(): Promise<
  Record<SupportedScanner, boolean>
> {
  const scanners = Object.keys(SCANNER_COMMANDS) as SupportedScanner[];
  const results = await Promise.all(
    scanners.map(async (s) => [s, await checkScannerAvailability(s)] as const)
  );
  return Object.fromEntries(results) as Record<SupportedScanner, boolean>;
}

/**
 * Get list of available scanners only.
 * Filters out scanners that are not installed.
 *
 * @returns Array of available scanner names
 */
export async function getAvailableScanners(): Promise<SupportedScanner[]> {
  const all = await checkAllScanners();
  return (Object.entries(all) as [SupportedScanner, boolean][])
    .filter(([, available]) => available)
    .map(([scanner]) => scanner);
}

/**
 * Clear the availability cache.
 * Call this after installing or uninstalling scanner binaries
 * to force a fresh check on the next availability query.
 */
export function clearAvailabilityCache(): void {
  availabilityCache.clear();
}

/**
 * Get cached availability without triggering a new check.
 * Returns null if the scanner has not been checked yet.
 *
 * @param scanner - The scanner to check
 * @returns Cached availability, or null if not yet checked
 */
export function getCachedAvailability(
  scanner: SupportedScanner
): boolean | null {
  return availabilityCache.get(scanner) ?? null;
}
