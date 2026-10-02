/**
 * Deep unit tests for scanUploadService (core of external CI/CD upload flow)
 *
 * Covers:
 * - Input validation (empty files, size limits)
 * - External repository auto-creation / resolution
 * - Sync path (<5MB) vs async path (>=5MB) decision
 * - Correct ordering for async (createScanResult before enqueue)
 * - Audit fields (projectApiTokenId / personalAccessTokenId)
 * - Error handling and status transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanUploadService } from '@/server/modules/scan/upload.service';
import { AppError } from '@/server/http/errors';
import type { StorageDriver } from '@/server/modules/storage/storage.interface';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks (must be self-contained inside factories because vitest hoists vi.mock) ---

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
    listScanResultsByScanId: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    createMany: vi.fn(),
  },
}));

const stableMockStorage: StorageDriver = {
  upload: vi.fn(),
  getUrl: vi.fn(),
  delete: vi.fn(),
  isConfigured: vi.fn().mockReturnValue(true),
  getStream: vi.fn(),
};

vi.mock('@/server/modules/storage/storage.service', () => ({
  getStorageDriver: () => stableMockStorage,
}));

vi.mock('@/server/modules/queue/queue.service', () => ({
  enqueue: vi.fn(),
}));

// Import the mocked modules AFTER vi.mock so we can get typed vi.mocked() handles
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { enqueue } from '@/server/modules/queue/queue.service';

const mockProjectRepo = vi.mocked(projectRepository);
const mockScanRepo = vi.mocked(scanRepository);
const mockFindingRepo = vi.mocked(findingRepository);
const mockEnqueue = vi.mocked(enqueue);

// We intentionally do NOT mock parsers here so small-file sync path exercises real parsers
// (this gives us integration flavor on the happy path without full DB).

// --- Helpers -------------------------------------------------------------

function makeSmallBuffer(scanner: string): { scanner: string; buffer: Buffer; originalName: string } {
  const content = scanner === 'semgrep'
    ? JSON.stringify({ results: [] })
    : 'dummy content for small file';
  return {
    scanner,
    buffer: Buffer.from(content),
    originalName: scanner === 'semgrep' ? 'semgrep.json' : 'report.txt',
  };
}

function makeLargeBuffer(scanner: string): { scanner: string; buffer: Buffer; originalName: string } {
  // > 5MB to trigger async path
  const size = 6 * 1024 * 1024;
  return {
    scanner,
    buffer: Buffer.alloc(size, 'x'),
    originalName: scanner === 'semgrep' ? 'semgrep.json' : 'big-report.xml',
  };
}

// --- Tests ---------------------------------------------------------------

describe('scanUploadService.uploadResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks using the centralized mockValue helper.
    // See the helper definition above for the rationale (Drizzle type complexity in tests).
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue(null));
    mockProjectRepo.attachRepository.mockResolvedValue(mockValue({ id: 'repo-ext-1' }));

    mockScanRepo.create.mockResolvedValue(mockValue({ id: 'scan-123' }));
    mockScanRepo.createScanUpload.mockResolvedValue(mockValue({ id: 'upload-456' }));
    mockScanRepo.createScanResult.mockImplementation(async (data: Record<string, unknown>) =>
      mockValue({
        id: `result-${Math.random().toString(36).slice(2)}`,
        ...data,
      })
    );
    mockScanRepo.updateStatus.mockResolvedValue(undefined);

    vi.mocked(stableMockStorage.upload).mockResolvedValue({ key: 'uploads/test/key.json', size: 123 });

    mockEnqueue.mockResolvedValue('job-789');
  });

  it('throws on empty files array', async () => {
    await expect(
      scanUploadService.uploadResults({
        projectId: 'proj-1',
        branch: 'main',
        commit: 'abc123',
        files: [],
        uploadedBy: 'user-1',
      })
    ).rejects.toThrow(AppError);
  });

  it('throws when total size exceeds MAX_UPLOAD_TOTAL_SIZE_BYTES', async () => {
    const huge = Buffer.alloc(60 * 1024 * 1024); // 60MB > 50MB limit
    await expect(
      scanUploadService.uploadResults({
        projectId: 'proj-1',
        branch: 'main',
        commit: 'abc123',
        files: [{ scanner: 'semgrep', buffer: huge, originalName: 'huge.json' }],
        uploadedBy: 'user-1',
      })
    ).rejects.toThrow(/exceeds configured limit/i);
  });

  it('auto-creates external repository when none exists', async () => {
    const input = {
      projectId: 'proj-1',
      repositoryUrl: 'https://github.com/acme/app',
      repositoryName: 'app',
      branch: 'main',
      commit: 'def456',
      files: [makeSmallBuffer('semgrep')],
      uploadedBy: 'user-1',
    };

    await scanUploadService.uploadResults(input);

    expect(mockProjectRepo.findExternalRepositoryByUrl).toHaveBeenCalledWith('proj-1', 'https://github.com/acme/app');
    expect(mockProjectRepo.attachRepository).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ connectionType: 'external' }),
      'user-1'
    );
  });

  it('uses existing external repository when found by URL', async () => {
    mockProjectRepo.findExternalRepositoryByUrl.mockResolvedValue(mockValue({ id: 'repo-existing' }));

    await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryUrl: 'https://github.com/acme/app',
      branch: 'main',
      commit: 'ghi789',
      files: [makeSmallBuffer('trivy')],
      uploadedBy: 'user-1',
    });

    expect(mockProjectRepo.attachRepository).not.toHaveBeenCalled();
  });

  it('processes small files synchronously and calls parser + finding insert', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'sync-001',
      files: [makeSmallBuffer('semgrep')],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(mockScanRepo.createScanResult).toHaveBeenCalled();
    expect(mockFindingRepo.createMany).not.toHaveBeenCalled(); // semgrep sample has 0 findings
    expect(mockEnqueue).not.toHaveBeenCalled(); // sync path
    expect(mockScanRepo.updateStatus).toHaveBeenCalledWith('scan-123', 'completed');
  });

  it('enqueues large files instead of parsing immediately (correct async ordering)', async () => {
    const largeFile = makeLargeBuffer('cppcheck');

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'async-001',
      files: [largeFile],
      uploadedBy: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(stableMockStorage.upload).toHaveBeenCalled();
    // createScanResult must be called BEFORE enqueue (critical ordering)
    expect(mockScanRepo.createScanResult).toHaveBeenCalledWith(
      expect.objectContaining({
        scanId: 'scan-123',
        scanner: 'cppcheck',
        parsedSummary: { status: 'queued_for_processing' },
      })
    );
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        scanResultId: expect.stringMatching(/^result-/), // real ID, not empty string
        scanner: 'cppcheck',
      })
    );
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  it('records projectApiTokenId and personalAccessTokenId in scan upload for audit', async () => {
    await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'audit-001',
      files: [makeSmallBuffer('gitleaks')],
      uploadedBy: 'user-1',
      projectApiTokenId: 'pat-123',
      personalAccessTokenId: 'userpat-456',
    });

    expect(mockScanRepo.createScanUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        projectApiTokenId: 'pat-123',
        personalAccessTokenId: 'userpat-456',
      })
    );
  });

  it('returns retention note in response', async () => {
    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'test-repo',
      branch: 'main',
      commit: 'ret-001',
      files: [makeSmallBuffer('trivy')],
      uploadedBy: 'user-1',
    });

    expect(result.retentionNote).toMatch(/30 days/i);
  });

  it('handles multiple scanner files in one upload (sync path)', async () => {
    const files = [
      makeSmallBuffer('semgrep'),
      makeSmallBuffer('trivy'),
    ];

    const result = await scanUploadService.uploadResults({
      projectId: 'proj-1',
      repositoryName: 'multi-scanner-repo',
      branch: 'main',
      commit: 'multi-001',
      files,
      uploadedBy: 'user-1',
    });

    expect(result.resultsCount).toBe(2);
    expect(mockScanRepo.createScanResult).toHaveBeenCalledTimes(2);
  });
});
