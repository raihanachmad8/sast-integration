/**
 * Unit tests for scanner-availability module
 *
 * Tests the scanner binary detection logic including:
 * - Platform-specific binary detection (which/where)
 * - Cache behavior (first check vs cached)
 * - Cache clearing
 * - All-scanner availability check
 *
 * Focus is on the detection routing and caching logic,
 * not on actual binary execution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecFileImpl } = vi.hoisted(() => ({
  mockExecFileImpl: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFile: mockExecFileImpl,
}));

import {
  checkScannerAvailability,
  checkAllScanners,
  getAvailableScanners,
  clearAvailabilityCache,
} from '@/server/modules/scan/scanner-availability';

// Detect platform for correct command assertions
const isWindows = process.platform === 'win32';
const whichCommand = isWindows ? 'where' : 'which';

// --- Tests ---------------------------------------------------------------

describe('checkScannerAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAvailabilityCache();
  });

  /**
   * Purpose: Verify that the correct platform command is used
   * to check scanner availability (which on Linux/Mac, where on Windows).
   */
  it(`should use "${whichCommand}" command on ${isWindows ? 'Windows' : 'Linux/Mac'}`, async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/semgrep', '');
      }
    );

    const result = await checkScannerAvailability('semgrep');

    expect(result).toBe(true);
    expect(mockExecFileImpl).toHaveBeenCalledWith(whichCommand, ['semgrep'], expect.any(Function));
  });

  /**
   * Purpose: Verify that when the command fails (binary not found),
   * the function returns false instead of throwing.
   */
  it('should return false when binary is not found', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(new Error('ENOENT'), '', '');
      }
    );

    const result = await checkScannerAvailability('nonexistent' as any);

    expect(result).toBe(false);
  });

  /**
   * Purpose: Verify that results are cached — second call does not
   * execute the command again.
   */
  it('should cache results and not re-check on second call', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/semgrep', '');
      }
    );

    await checkScannerAvailability('semgrep');
    expect(mockExecFileImpl).toHaveBeenCalledTimes(1);

    await checkScannerAvailability('semgrep');
    expect(mockExecFileImpl).toHaveBeenCalledTimes(1);
  });

  /**
   * Purpose: Verify that clearAvailabilityCache forces a fresh check
   * on the next availability query.
   */
  it('should re-check after cache is cleared', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/trivy', '');
      }
    );

    await checkScannerAvailability('trivy');
    expect(mockExecFileImpl).toHaveBeenCalledTimes(1);

    clearAvailabilityCache();

    await checkScannerAvailability('trivy');
    expect(mockExecFileImpl).toHaveBeenCalledTimes(2);
  });

  /**
   * Purpose: Verify that the command receives the correct binary name
   * from SCANNER_COMMANDS configuration.
   */
  it('should pass the correct binary name from SCANNER_COMMANDS', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/cppcheck', '');
      }
    );

    await checkScannerAvailability('cppcheck');

    expect(mockExecFileImpl).toHaveBeenCalledWith(whichCommand, ['cppcheck'], expect.any(Function));
  });
});

describe('checkAllScanners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAvailabilityCache();
  });

  /**
   * Purpose: Verify that checkAllScanners returns availability
   * for all supported scanners.
   */
  it('should return availability for all scanners', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/scanner', '');
      }
    );

    const result = await checkAllScanners();

    expect(result).toHaveProperty('semgrep');
    expect(result).toHaveProperty('gitleaks');
    expect(result).toHaveProperty('trivy');
    expect(result).toHaveProperty('cppcheck');
    expect(result).toHaveProperty('flawfinder');
    expect(result).toHaveProperty('sarif');
  });

  /**
   * Purpose: Verify that mixed availability is correctly reported
   * when some scanners are found and others are not.
   */
  it('should correctly report mixed availability', async () => {
    // Each scanner gets its own call, track by scanner name
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        const scanner = args[0];
        // semgrep, gitleaks, flawfinder are "available"; trivy, cppcheck, sarif are not
        if (['semgrep', 'gitleaks', 'flawfinder'].includes(scanner)) {
          cb(null, `/usr/local/bin/${scanner}`, '');
        } else {
          cb(new Error('ENOENT'), '', '');
        }
      }
    );

    const result = await checkAllScanners();

    expect(result.semgrep).toBe(true);
    expect(result.gitleaks).toBe(true);
    expect(result.flawfinder).toBe(true);
    expect(result.sarif).toBe(true); // sarif uses semgrep binary
    expect(result.trivy).toBe(false);
    expect(result.cppcheck).toBe(false);
  });
});

describe('getAvailableScanners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAvailabilityCache();
  });

  /**
   * Purpose: Verify that getAvailableScanners returns only
   * scanners that are installed.
   */
  it('should return only available scanners', async () => {
    mockExecFileImpl.mockImplementation(
      (cmd: string, args: string[], cb: (err: Error | null, stdout: string, stderr: string) => void) => {
        const scanner = args[0];
        if (['semgrep', 'gitleaks', 'flawfinder'].includes(scanner)) {
          cb(null, `/usr/local/bin/${scanner}`, '');
        } else {
          cb(new Error('ENOENT'), '', '');
        }
      }
    );

    const result = await getAvailableScanners();

    expect(result).toContain('semgrep');
    expect(result).toContain('gitleaks');
    expect(result).toContain('flawfinder');
    expect(result).not.toContain('trivy');
    expect(result).not.toContain('cppcheck');
  });
});
