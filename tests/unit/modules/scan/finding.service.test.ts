import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findingService } from '@/server/modules/scan/services/finding.service';

// Mock dependencies
vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    createMany: vi.fn(),
    create: vi.fn(),
    listByProject: vi.fn(),
    listByScan: vi.fn(),
    listByWorkspace: vi.fn(),
    listAccessible: vi.fn(),
    findById: vi.fn(),
    findGroupById: vi.fn(),
    getVerifications: vi.fn(),
    updateGroupStatus: vi.fn(),
    updateGroupsStatusBulk: vi.fn(),
    updateAssignment: vi.fn(),
    listOpenGroupsByRepository: vi.fn(),
    findOrCreateFindingGroups: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/services/finding.fingerprint', () => ({
  generateFindingFingerprint: vi.fn(),
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

describe('findingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should list findings for project', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      const mockFindings = [
        { id: 'f1', severity: 'high', groupStatus: 'open', scanner: 'semgrep' },
        { id: 'f2', severity: 'medium', groupStatus: 'resolved', scanner: 'cppcheck' },
      ];

      vi.mocked(findingRepository.listByProject).mockResolvedValue({
        data: mockFindings,
        total: 2,
      });

      const result = await findingService.list('project-123', 'workspace-123', {}, 50, 1);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list findings by scan ID', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      const mockFindings = [
        { id: 'f1', severity: 'critical', groupStatus: 'open', scanner: 'semgrep' },
      ];

      vi.mocked(findingRepository.listByScan).mockResolvedValue({
        data: mockFindings,
        total: 1,
      });

      const result = await findingService.list(undefined, 'workspace-123', { scanId: 'scan-123' }, 50, 1);

      expect(result.data).toHaveLength(1);
      expect(findingRepository.listByScan).toHaveBeenCalledWith('scan-123', expect.any(Object));
    });

    it('should list findings for workspace when no projectId', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      const mockFindings = [
        { id: 'f1', severity: 'low', groupStatus: 'open', scanner: 'flawfinder' },
      ];

      vi.mocked(findingRepository.listByWorkspace).mockResolvedValue({
        data: mockFindings,
        total: 1,
      });

      const result = await findingService.list(undefined, 'workspace-123', {}, 50, 1);

      expect(result.data).toHaveLength(1);
      expect(findingRepository.listByWorkspace).toHaveBeenCalledWith('workspace-123', expect.any(Object));
    });
  });

  describe('getById', () => {
    it('should get finding by ID with verifications', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      const mockFinding = {
        id: 'f1',
        scanId: 'scan-123',
        groupId: 'g1',
        severity: 'high',
        filePath: 'src/test.c',
        lineNumber: 10,
        codeSnippet: 'test code',
        description: 'Test finding',
        rule: 'test-rule',
        scanner: 'semgrep',
        message: 'Test message',
        cweId: 'CWE-79',
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(findingRepository.findById).mockResolvedValue(mockFinding);
      vi.mocked(findingRepository.findGroupById).mockResolvedValue({ id: 'g1', status: 'open' });
      vi.mocked(findingRepository.getVerifications).mockResolvedValue([{
        verdict: 'true_positive',
        confidence: 0.95,
        explanation: 'This is a real vulnerability',
      }]);

      const result = await findingService.getById('f1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('f1');
      expect(result?.severity).toBe('high');
      expect(result?.status).toBe('open');
      expect(result?.verdict).toBe('TP');
      expect(result?.confidence).toBe(0.95);
    });

    it('should return null when finding not found', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.findById).mockResolvedValue(null);

      const result = await findingService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update finding group status', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.findById).mockResolvedValue({ id: 'f1', groupId: 'g1' });
      vi.mocked(findingRepository.updateGroupStatus).mockResolvedValue({
        id: 'g1',
        status: 'resolved',
      });

      const result = await findingService.updateStatus('f1', 'resolved', 'user-123');

      expect(result).toBeDefined();
      expect(result.status).toBe('resolved');
      expect(findingRepository.updateGroupStatus).toHaveBeenCalledWith('g1', 'resolved', 'user-123');
    });

    it('should throw for invalid status', async () => {
      await expect(
        findingService.updateStatus('f1', 'invalid_status', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('assign', () => {
    it('should assign finding to user', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({
        id: 'f1',
        assignedTo: 'user-123',
      });

      const result = await findingService.assign('f1', 'user-123');

      expect(result).toBeDefined();
      expect(result.assignedTo).toBe('user-123');
    });

    it('should unassign finding', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({
        id: 'f1',
        assignedTo: null,
      });

      const result = await findingService.assign('f1', null);

      expect(result).toBeDefined();
      expect(result.assignedTo).toBeNull();
    });
  });

  describe('list with filters', () => {
    it('+ should filter findings by severity', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', { severity: 'critical' }, 50, 1);

      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ severity: 'critical' }));
    });

    it('+ should filter findings by status', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', { status: 'open' }, 50, 1);

      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ status: 'open' }));
    });

    it('+ should filter findings by scanner', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', { scanner: 'semgrep' }, 50, 1);

      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ scanner: 'semgrep' }));
    });

    it('+ should handle empty results', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      const result = await findingService.list('project-123', 'workspace-123', {}, 50, 1);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateStatus edge cases', () => {
    it('+ should support resolved status', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.findById).mockResolvedValue({ id: 'f1', groupId: 'g1' });
      vi.mocked(findingRepository.updateGroupStatus).mockResolvedValue({ id: 'g1', status: 'resolved' });

      const result = await findingService.updateStatus('f1', 'resolved', 'user-123');
      expect(result.status).toBe('resolved');
    });

    it('+ should support dismissed status', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.findById).mockResolvedValue({ id: 'f1', groupId: 'g1' });
      vi.mocked(findingRepository.updateGroupStatus).mockResolvedValue({ id: 'g1', status: 'dismissed' });

      const result = await findingService.updateStatus('f1', 'dismissed', 'user-123');
      expect(result.status).toBe('dismissed');
    });

    it('- should throw for empty status', async () => {
      await expect(findingService.updateStatus('f1', '', 'user-123')).rejects.toThrow();
    });
  });

  describe('list with pagination', () => {
    it('+ should handle page 1 with limit 10', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', {}, 10, 1);
      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ perPage: 10, page: 1 }));
    });

    it('+ should handle page 2 with limit 20', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', {}, 20, 2);
      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ perPage: 20, page: 2 }));
    });

    it('+ should handle multiple filters combined', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({ data: [], total: 0 });

      await findingService.list('project-123', 'workspace-123', { severity: 'high', status: 'open', scanner: 'semgrep' }, 50, 1);
      expect(findingRepository.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ severity: 'high', status: 'open', scanner: 'semgrep' }));
    });

    it('+ should return findings with all fields', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.listByProject).mockResolvedValue({
        data: [{ id: 'f1', severity: 'critical', groupStatus: 'open', scanner: 'semgrep', filePath: 'src/test.c', lineNumber: 10 }],
        total: 1,
      });

      const result = await findingService.list('project-123', 'workspace-123', {}, 50, 1);
      expect(result.data[0].id).toBe('f1');
      expect(result.data[0].severity).toBe('critical');
    });
  });

  describe('assign edge cases', () => {
    it('+ should assign to different user', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: 'user-456' });

      const result = await findingService.assign('f1', 'user-456');
      expect(result.assignedTo).toBe('user-456');
    });

    it('+ should call repository with correct ID', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

      await findingService.assign('f1', 'user-123');
      expect(findingRepository.updateAssignment).toHaveBeenCalledWith('f1', 'user-123');
    });

    it('+ should handle assign with null user', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: null });

      const result = await findingService.assign('f1', null);
      expect(result.assignedTo).toBeNull();
    });

    it('+ should handle multiple assign calls', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

      await findingService.assign('f1', 'user-123');
      await findingService.assign('f1', 'user-456');
      expect(findingRepository.updateAssignment).toHaveBeenCalledTimes(2);
    });

    it('+ should handle assign to same user', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

      const result = await findingService.assign('f1', 'user-123');
      expect(result.assignedTo).toBe('user-123');
    });

    it('+ should handle assign returning full object', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: 'user-123', updatedAt: new Date() });

      const result = await findingService.assign('f1', 'user-123');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('assignedTo');
    });

    it('+ should handle unassign returning null assignedTo', async () => {
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
      vi.mocked(findingRepository.updateAssignment).mockResolvedValue({ id: 'f1', assignedTo: null });

      const result = await findingService.assign('f1', null);
      expect(result.assignedTo).toBeNull();
      expect(result.id).toBe('f1');
    });
  });
});
