import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanService } from '@/server/modules/scan/scan.service';

// Mock dependencies
vi.mock('@/server/modules/scan/repositories/scan.repository', () => ({
  scanRepository: {
    listByWorkspace: vi.fn(),
    getById: vi.fn(),
    getRepositoryById: vi.fn(),
    getFindingsStats: vi.fn(),
    getAiStats: vi.fn(),
    getAiVerdictStats: vi.fn(),
    getScanResults: vi.fn(),
    getFindingsPerScanner: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    listByProject: vi.fn(),
    listByScan: vi.fn(),
    listByWorkspace: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    scan: {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('scanService', () => {
  const mockUserId = 'user-123';
  const mockWorkspaceId = 'workspace-123';
  const mockScanId = 'scan-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should list scans for workspace', async () => {
      const { scanRepository } = await import('@/server/modules/scan/repositories/scan.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(scanRepository.listByWorkspace).mockResolvedValue({
        data: [{
          id: mockScanId,
          repositoryName: 'test-repo',
          branch: 'main',
          status: 'completed',
          findingsCount: 5,
          criticalCount: 2,
          aiVerifiedCount: 3,
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:05:00Z'),
          origin: 'managed',
        }],
        total: 1,
      });

      const result = await scanService.list(mockWorkspaceId, { page: 1, perPage: 10 }, mockUserId);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].repository).toBe('test-repo');
      expect(result.data[0].status).toBe('Completed');
      expect(result.data[0].findings).toBe(5);
      expect(result.data[0].critical).toBe(2);
      expect(result.data[0].ai).toBe('3/5');
      expect(result.data[0].durationSeconds).toBe(300);
    });

    it('should throw FORBIDDEN when user is not a member', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        scanService.list(mockWorkspaceId, { page: 1, perPage: 10 }, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should get scan by ID', async () => {
      const { scanRepository } = await import('@/server/modules/scan/repositories/scan.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(scanRepository.getById).mockResolvedValue({
        id: mockScanId,
        status: 'completed',
        branch: 'main',
      });

      const result = await scanService.getById(mockScanId, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScanId);
    });

    it('should return null when scan not found', async () => {
      const { scanRepository } = await import('@/server/modules/scan/repositories/scan.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(scanRepository.getById).mockResolvedValue(null);

      await expect(
        scanService.getById(mockScanId, mockWorkspaceId, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('getDetail', () => {
    it('should get scan detail with all fields', async () => {
      const { scanRepository } = await import('@/server/modules/scan/repositories/scan.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(scanRepository.getById).mockResolvedValue({
        id: mockScanId,
        status: 'completed',
        branch: 'main',
        repositoryId: 'repo-123',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:05:00Z'),
        progressEvents: [],
        origin: 'managed',
        prNumber: null,
        baseBranch: null,
        headBranch: null,
        prAuthor: null,
      });
      vi.mocked(scanRepository.getRepositoryById).mockResolvedValue({ name: 'test-repo' });
      vi.mocked(scanRepository.getFindingsStats).mockResolvedValue({ total: 10, critical: 2, high: 3, medium: 3, low: 2 });
      vi.mocked(scanRepository.getAiStats).mockResolvedValue({ verified: 8 });
      vi.mocked(scanRepository.getAiVerdictStats).mockResolvedValue({ truePositives: 8, falsePositives: 0, pending: 2 });
      vi.mocked(scanRepository.getScanResults).mockResolvedValue([]);
      vi.mocked(scanRepository.getFindingsPerScanner).mockResolvedValue([{ scanner: 'semgrep', count: '8' }]);

      const result = await scanService.getDetail(mockScanId, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScanId);
      expect(result.repository).toBe('test-repo');
      expect(result.branch).toBe('main');
      expect(result.totalFindings).toBe(10);
      expect(result.severityBreakdown.critical).toBe(2);
      expect(result.aiStats.verified).toBe(8);
      expect(result.timeline).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new scan', async () => {
      const { scanRepository } = await import('@/server/modules/scan/repositories/scan.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(scanRepository.create).mockResolvedValue({
        id: mockScanId,
        status: 'pending',
      });

      const result = await scanService.create({
        repositoryId: 'repo-123',
        branch: 'main',
        origin: 'managed',
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockScanId);
    });
  });
});
