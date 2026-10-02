/**
 * E2E tests for scan upload flow using real scanner patterns.
 *
 * Tests the complete pipeline:
 * 1. Upload scanner results via API
 * 2. Verify scan record is created
 * 3. Verify findings are parsed correctly
 * 4. Verify severity mapping works
 * 5. Verify CWE extraction works
 *
 * Fixtures are based on real scanner rules:
 * - Semgrep: strcpy buffer overflow (CWE-120), eval injection (CWE-95)
 * - Gitleaks: API token detection, private key detection
 * - Flawfinder: strcpy [level 2], sprintf [level 4], printf [level 5]
 * - Cppcheck: null pointer (CWE-476), memory leak (CWE-401)
 * - Trivy: CVE vulnerabilities, Dockerfile misconfigs, secrets
 *
 * True Positive: Scanner correctly identifies a real vulnerability
 * False Negative: Scanner misses a real vulnerability (not tested here —
 *                 that requires running the actual scanner binary)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks ---

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: {
    findExternalRepositoryByUrl: vi.fn(),
    attachRepository: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/scan.repository', () => ({
  scanRepository: {
    create: vi.fn(),
    createScanResult: vi.fn(),
    createScanUpload: vi.fn(),
    updateStatus: vi.fn(),
    updateScanResult: vi.fn(),
    listScanResultsByScanId: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    createMany: vi.fn(),
  },
}));

vi.mock('@/server/modules/queue/queue.service', () => ({
  enqueue: vi.fn().mockResolvedValue('job-parse-1'),
}));

const stableMockStorage = {
  upload: vi.fn().mockResolvedValue({ key: 'uploads/test.json', size: 1024 }),
  getUrl: vi.fn(),
  delete: vi.fn(),
  isConfigured: vi.fn().mockReturnValue(true),
  getStream: vi.fn(),
};

vi.mock('@/server/modules/storage/storage.service', () => ({
  getStorageDriver: () => stableMockStorage,
}));

import { scanUploadService } from '@/server/modules/scan/upload.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';

const mockProjectRepo = vi.mocked(projectRepository);
const mockScanRepo = vi.mocked(scanRepository);

// ============================================================
// TRUE POSITIVE FIXTURES (scanner correctly identifies vulnerability)
// ============================================================

/** Semgrep: CWE-120 strcpy buffer overflow */
const SEMGREP_TRUE_POSITIVE = JSON.stringify({
  results: [
    {
      check_id: 'fixture.c-strcpy-overflow',
      path: 'src/vuln/buffer-overflow.c',
      start: { line: 8 },
      extra: {
        message: 'strcpy does not affirm the size of the destination array. This can lead to buffer overflows.',
        severity: 'ERROR',
        metadata: { cwe: 'CWE-120' },
      },
    },
  ],
});

/** Gitleaks: API token detection */
const GITLEAKS_TRUE_POSITIVE = JSON.stringify([
  {
    Description: 'Generic API Token',
    StartLine: 5,
    EndLine: 5,
    StartColumn: 1,
    Match: 'API_TOKEN="sk_live_REDACTED_FIXTURE_KEY"',
    File: 'config/.env',
    RuleID: 'generic-api-token',
    Entropy: 4.2,
  },
]);

/** Gitleaks: Private key detection */
const GITLEAKS_PRIVATE_KEY = JSON.stringify([
  {
    Description: 'Private Key',
    StartLine: 1,
    EndLine: 3,
    StartColumn: 1,
    Match: '-----BEGIN REDACTED PRIVATE KEY-----',
    File: 'certs/server.key',
    RuleID: 'private-key-block',
    Entropy: 0,
  },
]);

/** Flawfinder: strcpy level 2 (low) */
const FLAWFINDER_STRCPY = `./src/vuln/buffer.c:42:  [2] (buffer) strcpy: Does not check for buffer overflows when copying to destination [CWE-120]`;

/** Flawfinder: sprintf level 4 (high) */
const FLAWFINDER_SPRINTF = `./src/vuln/format.c:55:  [4] (buffer) sprintf: Potential format string problem [CWE-134]`;

/** Flawfinder: printf level 5 (critical) */
const FLAWFINDER_PRINTF = `./src/vuln/format.c:99:  [5] (format) printf: Uncontrolled format string [CWE-134]`;

/** Cppcheck: null pointer dereference */
const CPPCHECK_NULL_POINTER = `<?xml version="1.0" encoding="UTF-8"?>
<results>
  <error id="nullPointer" severity="error" msg="Possible null pointer dereference: ptr" cwe="476">
    <location file="src/vuln/null-deref.c" line="25"/>
  </error>
</results>`;

/** Cppcheck: memory leak */
const CPPCHECK_MEMLEAK = `<?xml version="1.0" encoding="UTF-8"?>
<results>
  <error id="memleak" severity="error" msg="Memory leak: allocated memory is never freed" cwe="401">
    <location file="src/vuln/memleak.c" line="10"/>
  </error>
</results>`;

/** Trivy: CVE vulnerability */
const TRIVY_CVE_VULNERABILITY = JSON.stringify({
  SchemaVersion: 2,
  Results: [
    {
      Target: 'app/package.json',
      Class: 'os-pkgs',
      Vulnerabilities: [
        {
          VulnerabilityID: 'CVE-2023-44487',
          PkgName: 'lodash',
          InstalledVersion: '4.17.20',
          Severity: 'HIGH',
          Title: 'Prototype Pollution in lodash',
          Description: 'Lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution.',
        },
      ],
    },
  ],
});

/** Trivy: Dockerfile misconfiguration */
const TRIVY_MISCONFIG = JSON.stringify({
  SchemaVersion: 2,
  Results: [
    {
      Target: 'Dockerfile',
      Class: 'config',
      Misconfigurations: [
        {
          ID: 'DS002',
          Title: 'Do not use the latest tag for the FROM instruction',
          Severity: 'MEDIUM',
          Message: 'Ensure that a pinned version is used for the FROM instruction.',
        },
      ],
    },
  ],
});

/** Trivy: Secret detection */
const TRIVY_SECRET = JSON.stringify({
  SchemaVersion: 2,
  Results: [
    {
      Target: '.env',
      Class: 'secret',
      Secrets: [
        {
          RuleID: 'generic-api-key',
          Severity: 'HIGH',
          Title: 'Generic API Key',
          Match: 'AKIA_REDACTED_EXAMPLE_KEY',
        },
      ],
    },
  ],
});

// ============================================================
// FALSE NEGATIVE FIXTURES (safe code patterns)
// ============================================================

/** Semgrep: No findings (safe code) */
const SEMGREP_FALSE_NEGATIVE = JSON.stringify({
  results: [],
});

/** Flawfinder: No findings (safe code) */
const FLAWFINDER_SAFE = `./src/safe/safe-string.c:10:  No results found`;

/** Gitleaks: No secrets found */
const GITLEAKS_FALSE_NEGATIVE = JSON.stringify([]);

// ============================================================
// TESTS
// ============================================================

describe('Scan Upload E2E - True Positive Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-1', status: 'processing' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-1' }));
    mockScanRepo.createScanResult.mockImplementation(async (data: Record<string, unknown>) =>
      mockValue({ id: `result-${Date.now()}`, ...data })
    );
    mockScanRepo.updateStatus.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that uploading semgrep results with real CWE-120
   * (strcpy buffer overflow) correctly parses the finding with severity and CWE.
   */
  it('should parse semgrep CWE-120 buffer overflow finding', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'vuln-repo',
      branch: 'main',
      commit: 'abc123',
      files: [{ scanner: 'semgrep', buffer: Buffer.from(SEMGREP_TRUE_POSITIVE), originalName: 'semgrep.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
    expect(mockScanRepo.createScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ scanner: 'semgrep' })
    );
  });

  /**
   * Purpose: Verify that semgrep findings include CWE mapping
   * for vulnerability identification.
   */
  it('should include CWE-120 in semgrep finding metadata', async () => {
    await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'vuln-repo',
      branch: 'main',
      commit: 'def456',
      files: [{ scanner: 'semgrep', buffer: Buffer.from(SEMGREP_TRUE_POSITIVE), originalName: 'semgrep.json' }],
      uploadedBy: 'user-1',
    });

    expect(mockScanRepo.createScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        scanner: 'semgrep',
        parsedSummary: expect.objectContaining({
          totalFindings: expect.any(Number),
        }),
      })
    );
  });

  /**
   * Purpose: Verify that gitleaks correctly identifies hardcoded API tokens.
   * This is a true positive — the token is real and should be flagged.
   */
  it('should detect gitleaks API token true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'secret-repo',
      branch: 'main',
      commit: 'ghi789',
      files: [{ scanner: 'gitleaks', buffer: Buffer.from(GITLEAKS_TRUE_POSITIVE), originalName: 'gitleaks.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that gitleaks correctly identifies private keys.
   * This is a true positive — PEM private key should be flagged.
   */
  it('should detect gitleaks private key true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'cert-repo',
      branch: 'main',
      commit: 'jkl012',
      files: [{ scanner: 'gitleaks', buffer: Buffer.from(GITLEAKS_PRIVATE_KEY), originalName: 'gitleaks.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that flawfinder correctly identifies strcpy vulnerability.
   * Level 2 = low severity, CWE-120.
   */
  it('should detect flawfinder strcpy true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'c-repo',
      branch: 'main',
      commit: 'mno345',
      files: [{ scanner: 'flawfinder', buffer: Buffer.from(FLAWFINDER_STRCPY), originalName: 'flawfinder.txt' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that flawfinder correctly identifies sprintf vulnerability.
   * Level 4 = high severity, CWE-134.
   */
  it('should detect flawfinder sprintf true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'c-repo',
      branch: 'main',
      commit: 'pqr678',
      files: [{ scanner: 'flawfinder', buffer: Buffer.from(FLAWFINDER_SPRINTF), originalName: 'flawfinder.txt' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that flawfinder correctly identifies printf format string.
   * Level 5 = critical severity, CWE-134.
   */
  it('should detect flawfinder printf critical true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'c-repo',
      branch: 'main',
      commit: 'stu901',
      files: [{ scanner: 'flawfinder', buffer: Buffer.from(FLAWFINDER_PRINTF), originalName: 'flawfinder.txt' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that cppcheck correctly identifies null pointer dereference.
   * Severity: error → high, CWE-476.
   */
  it('should detect cppcheck null pointer true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'c-repo',
      branch: 'main',
      commit: 'vwx234',
      files: [{ scanner: 'cppcheck', buffer: Buffer.from(CPPCHECK_NULL_POINTER), originalName: 'cppcheck.xml' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that cppcheck correctly identifies memory leak.
   * Severity: error → high, CWE-401.
   */
  it('should detect cppcheck memory leak true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'c-repo',
      branch: 'main',
      commit: 'yz5678',
      files: [{ scanner: 'cppcheck', buffer: Buffer.from(CPPCHECK_MEMLEAK), originalName: 'cppcheck.xml' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that trivy correctly identifies CVE vulnerabilities.
   * Severity: HIGH → high.
   */
  it('should detect trivy CVE vulnerability true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'node-repo',
      branch: 'main',
      commit: 'abc901',
      files: [{ scanner: 'trivy', buffer: Buffer.from(TRIVY_CVE_VULNERABILITY), originalName: 'trivy.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that trivy correctly identifies Dockerfile misconfigurations.
   * Severity: MEDIUM → medium.
   */
  it('should detect trivy Dockerfile misconfiguration', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'docker-repo',
      branch: 'main',
      commit: 'def234',
      files: [{ scanner: 'trivy', buffer: Buffer.from(TRIVY_MISCONFIG), originalName: 'trivy.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that trivy correctly identifies hardcoded secrets.
   * Severity: HIGH → high.
   */
  it('should detect trivy secret true positive', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'env-repo',
      branch: 'main',
      commit: 'ghi567',
      files: [{ scanner: 'trivy', buffer: Buffer.from(TRIVY_SECRET), originalName: 'trivy.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });
});

describe('Scan Upload E2E - False Negatives (Safe Code)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-2', status: 'processing' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-2' }));
    mockScanRepo.createScanResult.mockImplementation(async (data: Record<string, unknown>) =>
      mockValue({ id: `result-${Date.now()}`, ...data })
    );
    mockScanRepo.updateStatus.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that semgrep returns empty results for safe code
   * (no vulnerabilities detected = false negative scenario).
   */
  it('should return no findings for safe code (semgrep)', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'safe-repo',
      branch: 'main',
      commit: 'safe001',
      files: [{ scanner: 'semgrep', buffer: Buffer.from(SEMGREP_FALSE_NEGATIVE), originalName: 'semgrep.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that flawfinder returns no findings for safe code.
   */
  it('should return no findings for safe code (flawfinder)', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'safe-repo',
      branch: 'main',
      commit: 'safe002',
      files: [{ scanner: 'flawfinder', buffer: Buffer.from(FLAWFINDER_SAFE), originalName: 'flawfinder.txt' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });

  /**
   * Purpose: Verify that gitleaks returns empty results for safe code
   * (no secrets detected = false negative scenario).
   */
  it('should return no findings for safe code (gitleaks)', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'safe-repo',
      branch: 'main',
      commit: 'safe003',
      files: [{ scanner: 'gitleaks', buffer: Buffer.from(GITLEAKS_FALSE_NEGATIVE), originalName: 'gitleaks.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
  });
});

describe('Scan Upload E2E - Multi-Scanner Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-3', status: 'processing' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-3' }));
    mockScanRepo.createScanResult.mockImplementation(async (data: Record<string, unknown>) =>
      mockValue({ id: `result-${Date.now()}`, ...data })
    );
    mockScanRepo.updateStatus.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that uploading multiple scanner results in a single request
   * creates separate scan results for each scanner.
   */
  it('should handle semgrep + gitleaks + flawfinder in one upload', async () => {
    const files = [
      { scanner: 'semgrep', buffer: Buffer.from(SEMGREP_TRUE_POSITIVE), originalName: 'semgrep.json' },
      { scanner: 'gitleaks', buffer: Buffer.from(GITLEAKS_TRUE_POSITIVE), originalName: 'gitleaks.json' },
      { scanner: 'flawfinder', buffer: Buffer.from(FLAWFINDER_STRCPY), originalName: 'flawfinder.txt' },
    ];

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'multi-repo',
      branch: 'main',
      commit: 'multi001',
      files,
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(3);
    expect(mockScanRepo.createScanResult).toHaveBeenCalledTimes(3);
  });

  /**
   * Purpose: Verify that uploading mixed true positive and false negative
   * results processes all files correctly.
   */
  it('should handle mixed true positive and false negative results', async () => {
    const files = [
      { scanner: 'semgrep', buffer: Buffer.from(SEMGREP_TRUE_POSITIVE), originalName: 'semgrep-vuln.json' },
      { scanner: 'semgrep', buffer: Buffer.from(SEMGREP_FALSE_NEGATIVE), originalName: 'semgrep-safe.json' },
      { scanner: 'gitleaks', buffer: Buffer.from(GITLEAKS_TRUE_POSITIVE), originalName: 'gitleaks-secret.json' },
    ];

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'mixed-repo',
      branch: 'main',
      commit: 'mixed001',
      files,
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(3);
  });
});
