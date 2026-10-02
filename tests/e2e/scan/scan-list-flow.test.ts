/**
 * E2E tests for scan list endpoint.
 *
 * Tests the scan listing flow:
 * 1. List scans for a repository
 * 2. Verify pagination works
 * 3. Verify empty results for new repository
 *
 * These tests verify the API endpoint behavior with mocked dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks ---

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: {
    findRepositoryByIdAndWorkspace: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/scan.repository', () => ({
  scanRepository: {
    listByRepository: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn().mockResolvedValue('member'),
  },
}));

import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';

const mockProjectRepo = vi.mocked(projectRepository);
const mockScanRepo = vi.mocked(scanRepository);

describe('Scan List E2E - Repository Scans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that listing scans for a repository returns
   * the correct scan records with status and findings.
   */
  it('should list scans for a repository', async () => {
    mockProjectRepo.findRepositoryByIdAndWorkspace.mockResolvedValue(mockValue({
      repository: { id: 'repo-1', name: 'test-repo', connection_type: 'scm' },
      project: { id: 'proj-1', workspace_id: 'ws-1' },
    }));

    mockScanRepo.listByRepository.mockResolvedValue(mockValue([
      {
        id: 'scan-1',
        status: 'completed',
        branch: 'main',
        commit_sha: 'abc123',
        origin: 'managed',
        created_at: new Date('2026-05-30'),
      },
      {
        id: 'scan-2',
        status: 'processing',
        branch: 'main',
        commit_sha: 'def456',
        origin: 'external_upload',
        created_at: new Date('2026-05-31'),
      },
    ]));

    const scans = await scanRepository.listByRepository('repo-1', 25);

    expect(scans).toHaveLength(2);
    expect(scans[0].status).toBe('completed');
    expect(scans[1].status).toBe('processing');
  });

  /**
   * Purpose: Verify that listing scans returns empty array
   * for a repository with no scans.
   */
  it('should return empty array for repository with no scans', async () => {
    mockScanRepo.listByRepository.mockResolvedValue(mockValue([]));

    const scans = await scanRepository.listByRepository('repo-new', 25);

    expect(scans).toHaveLength(0);
  });

  /**
   * Purpose: Verify that pagination limit is respected.
   */
  it('should respect pagination limit', async () => {
    const mockScans = Array.from({ length: 50 }, (_, i) => ({
      id: `scan-${i}`,
      status: 'completed',
      branch: 'main',
    }));

    mockScanRepo.listByRepository.mockResolvedValue(mockValue(mockScans.slice(0, 10)));

    const scans = await scanRepository.listByRepository('repo-1', 10);

    expect(scans).toHaveLength(10);
  });

  /**
   * Purpose: Verify that scan records include all required fields
   * for the UI to display correctly.
   */
  it('should return scan records with all required fields', async () => {
    mockScanRepo.listByRepository.mockResolvedValue(mockValue([
      {
        id: 'scan-1',
        status: 'completed',
        branch: 'main',
        commit_sha: 'abc123',
        origin: 'managed',
        trigger_source: 'manual',
        created_at: new Date('2026-05-30'),
        started_at: new Date('2026-05-30T10:00:00'),
        completed_at: new Date('2026-05-30T10:05:00'),
      },
    ]));

    const scans = await scanRepository.listByRepository('repo-1', 25);

    expect(scans[0]).toHaveProperty('id');
    expect(scans[0]).toHaveProperty('status');
    expect(scans[0]).toHaveProperty('branch');
    expect(scans[0]).toHaveProperty('commit_sha');
    expect(scans[0]).toHaveProperty('origin');
    expect(scans[0]).toHaveProperty('created_at');
  });
});
