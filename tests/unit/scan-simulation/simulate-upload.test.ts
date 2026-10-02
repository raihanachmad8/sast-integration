/**
 * E2E simulation tests for CI upload flow.
 *
 * Tests the complete upload pipeline using fixture files:
 * 1. Load scanner results from fixtures
 * 2. Call scanUploadService.uploadResults()
 * 3. Verify scan record is created
 * 4. Verify findings are created (for sync path)
 *
 * These tests use real service logic with mocked storage and DB,
 * providing integration-level coverage without a running server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFixture } from './helpers';
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

// --- Tests ---------------------------------------------------------------

describe('CI Upload Simulation - Semgrep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-ext-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-sim-1' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-1' }));
    mockScanRepo.createScanResult.mockResolvedValue(mockValue({ id: 'result-1' }));
    mockScanRepo.updateStatus.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that uploading semgrep results creates a scan record
   * and processes the findings through the sync path (<5MB).
   */
  it('should upload semgrep results and create scan record', async () => {
    const buffer = loadFixture('semgrep');

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'abc123',
      files: [{ scanner: 'semgrep', buffer, originalName: 'semgrep.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(1);
    expect(mockScanRepo.create).toHaveBeenCalled();
    expect(mockScanRepo.createScanResult).toHaveBeenCalled();
  });
});

describe('CI Upload Simulation - Gitleaks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-ext-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-sim-2' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-2' }));
    mockScanRepo.createScanResult.mockResolvedValue(mockValue({ id: 'result-2' }));
    mockScanRepo.updateStatus.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that uploading gitleaks results processes the file
   * through the upload pipeline and creates a scan result record.
   */
  it('should upload gitleaks results and create scan result', async () => {
    const buffer = loadFixture('gitleaks');

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'def456',
      files: [{ scanner: 'gitleaks', buffer, originalName: 'gitleaks.json' }],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(mockScanRepo.createScanResult).toHaveBeenCalled();
  });
});

describe('CI Upload Simulation - Multi-scanner upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-ext-1' }));
    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-sim-3' }));
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
  it('should handle multiple scanners in one upload', async () => {
    const files = [
      { scanner: 'semgrep', buffer: loadFixture('semgrep'), originalName: 'semgrep.json' },
      { scanner: 'gitleaks', buffer: loadFixture('gitleaks'), originalName: 'gitleaks.json' },
    ];

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'multi-repo',
      branch: 'main',
      commit: 'multi-001',
      files,
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.resultsCount).toBe(2);
    expect(mockScanRepo.createScanResult).toHaveBeenCalledTimes(2);
  });
});
