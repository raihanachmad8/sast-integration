import { describe, it, expect, vi, beforeEach } from 'vitest';
import { qualityGateService } from '@/server/modules/scan/services/quality-gate.service';

// Mock dependencies
vi.mock('@/server/modules/scan/repositories/quality-gate.repository', () => ({
  qualityGateRepository: {
    findByWorkspace: vi.fn(),
    upsert: vi.fn(),
    createResult: vi.fn(),
    listResults: vi.fn(),
  },
}));

vi.mock('@/server/modules/scan/repositories/finding.repository', () => ({
  findingRepository: {
    listByProject: vi.fn(),
    diffNewFindings: vi.fn(),
    diffFixedFindings: vi.fn(),
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

describe('qualityGateService', () => {
  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should get existing config', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const mockGate = {
        id: 'gate-123',
        workspaceId: mockWorkspaceId,
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
      };

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue(mockGate);

      const result = await qualityGateService.getConfig(mockWorkspaceId);

      expect(result).toBeDefined();
      expect(result.id).toBe('gate-123');
      expect(result.threshold).toBe('high');
    });

    it('should create default config if none exists', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const mockGate = {
        id: 'gate-new',
        workspaceId: mockWorkspaceId,
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        requireHumanAck: false,
        pendingBehavior: 'warn',
      };

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue(null);
      vi.mocked(qualityGateRepository.upsert).mockResolvedValue(mockGate);

      const result = await qualityGateService.getConfig(mockWorkspaceId);

      expect(result).toBeDefined();
      expect(result.id).toBe('gate-new');
      expect(qualityGateRepository.upsert).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update config for owner', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(qualityGateRepository.upsert).mockResolvedValue({
        id: 'gate-123',
        threshold: 'critical',
        failOnCritical: true,
      });

      const result = await qualityGateService.updateConfig(
        mockWorkspaceId,
        { threshold: 'critical' },
        mockUserId
      );

      expect(result).toBeDefined();
      expect(result.threshold).toBe('critical');
    });

    it('should throw FORBIDDEN for non-member', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        qualityGateService.updateConfig(mockWorkspaceId, { threshold: 'low' }, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('evaluateScan', () => {
    it('should evaluate scan and pass when no blocking findings', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue({
        id: 'gate-123',
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        pendingBehavior: 'warn',
      });
      vi.mocked(findingRepository.listByProject).mockResolvedValue({
        data: [
          { severity: 'low' },
          { severity: 'info' },
        ],
        total: 2,
      });
      vi.mocked(qualityGateRepository.createResult).mockResolvedValue({ id: 'result-123' });

      const result = await qualityGateService.evaluateScan('scan-123', mockWorkspaceId, 'project-123');

      expect(result.status).toBe('passed');
      expect(result.findings.blocking).toBe(0);
    });

    it('should fail when critical findings present', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue({
        id: 'gate-123',
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        pendingBehavior: 'warn',
      });
      vi.mocked(findingRepository.listByProject).mockResolvedValue({
        data: [
          { severity: 'critical' },
          { severity: 'high' },
        ],
        total: 2,
      });
      vi.mocked(qualityGateRepository.createResult).mockResolvedValue({ id: 'result-123' });

      const result = await qualityGateService.evaluateScan('scan-123', mockWorkspaceId, 'project-123');

      expect(result.status).toBe('failed');
      expect(result.findings.blocking).toBe(2);
    });

    it('should warn when pending findings present', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue({
        id: 'gate-123',
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        pendingBehavior: 'warn',
      });
      // No blocking findings (no critical/high), but has open findings (pending AI verification)
      vi.mocked(findingRepository.listByProject).mockResolvedValue({
        data: [
          { severity: 'low', status: 'open' },
        ],
        total: 1,
      });
      vi.mocked(qualityGateRepository.createResult).mockResolvedValue({ id: 'result-123' });

      const result = await qualityGateService.evaluateScan('scan-123', mockWorkspaceId, 'project-123');

      expect(result.status).toBe('warning');
      expect(result.findings.pending).toBe(1);
    });
  });

  describe('evaluatePrScan', () => {
    it('should evaluate PR scan with new findings only', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue({
        id: 'gate-123',
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        pendingBehavior: 'warn',
      });
      vi.mocked(findingRepository.diffNewFindings).mockResolvedValue({
        data: [{ severity: 'high' }],
        total: 1,
      });
      vi.mocked(findingRepository.diffFixedFindings).mockResolvedValue({
        data: [],
        total: 0,
      });
      vi.mocked(qualityGateRepository.createResult).mockResolvedValue({ id: 'result-123' });

      const result = await qualityGateService.evaluatePrScan(
        'scan-123',
        mockWorkspaceId,
        'repo-123',
        'feature-branch',
        'main'
      );

      expect(result.status).toBe('failed');
      expect(result.pr.newFindings).toBe(1);
      expect(result.pr.fixedFindings).toBe(0);
      expect(result.pr.headBranch).toBe('feature-branch');
      expect(result.pr.baseBranch).toBe('main');
    });

    it('should pass PR scan with no new findings', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');

      vi.mocked(qualityGateRepository.findByWorkspace).mockResolvedValue({
        id: 'gate-123',
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        warnOnPending: true,
        pendingBehavior: 'warn',
      });
      vi.mocked(findingRepository.diffNewFindings).mockResolvedValue({
        data: [],
        total: 0,
      });
      vi.mocked(findingRepository.diffFixedFindings).mockResolvedValue({
        data: [{ severity: 'high' }],
        total: 1,
      });
      vi.mocked(qualityGateRepository.createResult).mockResolvedValue({ id: 'result-123' });

      const result = await qualityGateService.evaluatePrScan(
        'scan-123',
        mockWorkspaceId,
        'repo-123',
        'feature-branch',
        'main'
      );

      expect(result.status).toBe('passed');
      expect(result.pr.newFindings).toBe(0);
      expect(result.pr.fixedFindings).toBe(1);
    });
  });

  describe('listResults', () => {
    it('should list gate results for workspace', async () => {
      const { qualityGateRepository } = await import('@/server/modules/scan/repositories/quality-gate.repository');
      vi.mocked(qualityGateRepository.listResults).mockResolvedValue([
        { id: 'r1', status: 'passed' },
        { id: 'r2', status: 'failed' },
      ]);

      const result = await qualityGateService.listResults(mockWorkspaceId);

      expect(result).toHaveLength(2);
    });
  });
});
