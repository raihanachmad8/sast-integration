import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findingService } from '@/server/modules/scan/services/finding.service';

// Mock dependencies — only external repos and infrastructure
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
    scan: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  },
}));

vi.mock('@/server/db/client', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve([]), {
              limit: vi.fn().mockResolvedValue([]),
              groupBy: vi.fn().mockResolvedValue([]),
            })
          ),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve([]), {
              limit: vi.fn().mockResolvedValue([]),
            })
          ),
        }),
        where: vi.fn().mockReturnValue(
          Object.assign(Promise.resolve([]), {
            limit: vi.fn().mockResolvedValue([]),
          })
        ),
      }),
    }),
    transaction: vi.fn((fn: any) => fn({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(
              Object.assign(Promise.resolve([]), {
                limit: vi.fn().mockResolvedValue([]),
              })
            ),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(
              Object.assign(Promise.resolve([]), {
                limit: vi.fn().mockResolvedValue([]),
              })
            ),
          }),
          where: vi.fn().mockReturnValue(
            Object.assign(Promise.resolve([]), {
              limit: vi.fn().mockResolvedValue([]),
            })
          ),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    })),
  },
}));

vi.mock('@/server/modules/source-control/scm-api.service', () => ({
  createScmApiService: vi.fn(),
  buildInlineReviewComment: vi.fn(),
  parseRepoName: vi.fn(),
}));

vi.mock('@/server/env', () => ({
  env: { APP_URL: 'http://localhost:3000' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  isNotNull: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray) => strings[0] ?? ''),
}));

import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { generateFindingFingerprint } from '@/server/modules/scan/services/finding.fingerprint';

const mockRepo = vi.mocked(findingRepository);
const mockFingerprint = vi.mocked(generateFindingFingerprint);

describe('findingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    describe('✅ positive', () => {
      it('should return paginated findings for a project', async () => {
        const mockData = [
          { id: 'f1', severity: 'high', groupStatus: 'open', scanner: 'semgrep' },
          { id: 'f2', severity: 'medium', groupStatus: 'resolved', scanner: 'cppcheck' },
        ];
        mockRepo.listByProject.mockResolvedValue({ data: mockData, total: 2 });

        const result = await findingService.list('project-123', 'workspace-123', {}, 50, 1);

        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(mockRepo.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({ perPage: 50, page: 1 }));
      });

      it('should delegate to listByScan when scanId filter is provided', async () => {
        mockRepo.listByScan.mockResolvedValue({ data: [{ id: 'f1' }], total: 1 });

        const result = await findingService.list(undefined, 'workspace-123', { scanId: 'scan-456' }, 50, 1);

        expect(mockRepo.listByScan).toHaveBeenCalledWith('scan-456', expect.any(Object));
        expect(result.data).toHaveLength(1);
      });

      it('should delegate to listAccessible when accessibleProjectIds provided', async () => {
        mockRepo.listAccessible.mockResolvedValue({ data: [{ id: 'f1' }], total: 1 });

        const result = await findingService.list(undefined, 'workspace-123', { accessibleProjectIds: ['p1', 'p2'] }, 50, 1);

        expect(mockRepo.listAccessible).toHaveBeenCalledWith('workspace-123', ['p1', 'p2'], expect.any(Object));
        expect(result.data).toHaveLength(1);
      });

      it('should delegate to listByWorkspace when no projectId or scanId', async () => {
        mockRepo.listByWorkspace.mockResolvedValue({ data: [{ id: 'f1' }], total: 1 });

        const result = await findingService.list(undefined, 'workspace-123', {}, 50, 1);

        expect(mockRepo.listByWorkspace).toHaveBeenCalledWith('workspace-123', expect.any(Object));
        expect(result.data).toHaveLength(1);
      });

      it('should pass all filter values to repository', async () => {
        mockRepo.listByProject.mockResolvedValue({ data: [], total: 0 });

        await findingService.list('project-123', 'workspace-123', {
          severity: 'critical',
          status: 'open',
          scanner: 'semgrep',
          verdict: 'true_positive',
          sort: 'severity',
          order: 'DESC',
        }, 25, 2);

        expect(mockRepo.listByProject).toHaveBeenCalledWith('project-123', expect.objectContaining({
          severity: 'critical',
          status: 'open',
          scanner: 'semgrep',
          verdict: 'true_positive',
          sort: 'severity',
          order: 'DESC',
          perPage: 25,
          page: 2,
        }));
      });
    });

    describe('❌ negative', () => {
      it('should propagate repository errors', async () => {
        mockRepo.listByProject.mockRejectedValue(new Error('Database connection failed'));

        await expect(
          findingService.list('project-123', 'workspace-123', {}, 50, 1)
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('🔲 edge cases', () => {
      it('should return empty results when no findings match', async () => {
        mockRepo.listByProject.mockResolvedValue({ data: [], total: 0 });

        const result = await findingService.list('project-123', 'workspace-123', {}, 50, 1);

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });
  });

  describe('getById', () => {
    describe('✅ positive', () => {
      it('should return finding with all fields when found', async () => {
        mockRepo.findById.mockResolvedValue({
          id: 'f1', scanId: 'scan-1', groupId: 'g1', severity: 'high',
          filePath: 'src/app.ts', lineNumber: 42, codeSnippet: 'code',
          description: 'desc', rule: 'rule-1', scanner: 'semgrep',
          message: 'msg', cweId: 'CWE-79', assignedTo: null,
          createdAt: new Date(), updatedAt: new Date(),
        });
        mockRepo.findGroupById.mockResolvedValue({ id: 'g1', status: 'open' });
        mockRepo.getVerifications.mockResolvedValue([{
          verdict: 'true_positive', confidence: 0.95,
          explanation: 'Real vuln', modelId: 'model-1',
          dataFlow: null, taintSource: null, matchDetail: null,
          likelyCwe: null, fixSuggestion: null, latencyMs: null, rawResponse: null,
        }]);

        const result = await findingService.getById('f1');

        expect(result).toBeDefined();
        expect(result?.id).toBe('f1');
        expect(result?.severity).toBe('high');
        expect(result?.status).toBe('open');
        expect(result?.verdict).toBe('TP');
        expect(result?.confidence).toBe(0.95);
        expect(result?.explanation).toBe('Real vuln');
      });

      it('should return finding with Pending verdict when no verifications exist', async () => {
        mockRepo.findById.mockResolvedValue({
          id: 'f1', scanId: 'scan-1', groupId: 'g1', severity: 'medium',
          filePath: null, lineNumber: null, codeSnippet: null,
          description: null, rule: null, scanner: null,
          message: null, cweId: null, assignedTo: null,
          createdAt: new Date(), updatedAt: new Date(),
        });
        mockRepo.findGroupById.mockResolvedValue({ id: 'g1', status: 'open' });
        mockRepo.getVerifications.mockResolvedValue([]);

        const result = await findingService.getById('f1');

        expect(result?.verdict).toBe('Pending');
        expect(result?.confidence).toBeNull();
      });
    });

    describe('❌ negative', () => {
      it('should return null when finding does not exist', async () => {
        mockRepo.findById.mockResolvedValue(null);

        const result = await findingService.getById('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('updateStatus', () => {
    describe('✅ positive', () => {
      it('should update group status to resolved', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1' });
        mockRepo.updateGroupStatus.mockResolvedValue({ id: 'g1', status: 'resolved' });

        const result = await findingService.updateStatus('f1', 'resolved', 'user-123');

        expect(result).toBeDefined();
        expect(result.status).toBe('resolved');
        expect(mockRepo.updateGroupStatus).toHaveBeenCalledWith('g1', 'resolved', 'user-123');
      });

      it('should update group status to dismissed', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1' });
        mockRepo.updateGroupStatus.mockResolvedValue({ id: 'g1', status: 'dismissed' });

        const result = await findingService.updateStatus('f1', 'dismissed', 'user-123');

        expect(result.status).toBe('dismissed');
      });

      it('should update group status to open', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1' });
        mockRepo.updateGroupStatus.mockResolvedValue({ id: 'g1', status: 'open' });

        const result = await findingService.updateStatus('f1', 'open', 'user-123');

        expect(result.status).toBe('open');
      });
    });

    describe('❌ negative', () => {
      it('should throw AppError for invalid status value', async () => {
        await expect(
          findingService.updateStatus('f1', 'invalid_status', 'user-123')
        ).rejects.toThrow('Invalid status');
      });

      it('should throw when finding does not exist', async () => {
        mockRepo.findById.mockResolvedValue(null);

        await expect(
          findingService.updateStatus('nonexistent', 'resolved', 'user-123')
        ).rejects.toThrow();
      });

      it('should throw when finding has no group', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: null });

        await expect(
          findingService.updateStatus('f1', 'resolved', 'user-123')
        ).rejects.toThrow('Finding has no associated group');
      });

      it('should throw when repository updateGroupStatus returns null', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1' });
        mockRepo.updateGroupStatus.mockResolvedValue(null);

        await expect(
          findingService.updateStatus('f1', 'resolved', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('🔲 edge cases', () => {
      it('should reject empty string status', async () => {
        await expect(
          findingService.updateStatus('f1', '', 'user-123')
        ).rejects.toThrow('Invalid status');
      });

      it('should reject status with wrong casing', async () => {
        await expect(
          findingService.updateStatus('f1', 'Resolved', 'user-123')
        ).rejects.toThrow('Invalid status');
      });
    });
  });

  describe('assign', () => {
    describe('✅ positive', () => {
      it('should call updateAssignment with findingId and userId', async () => {
        mockRepo.updateAssignment.mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

        await findingService.assign('f1', 'user-123');

        expect(mockRepo.updateAssignment).toHaveBeenCalledWith('f1', 'user-123');
      });

      it('should return updated finding with assignedTo populated', async () => {
        mockRepo.updateAssignment.mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

        const result = await findingService.assign('f1', 'user-123');

        expect(result.assignedTo).toBe('user-123');
        expect(result.id).toBe('f1');
      });

      it('should unassign when userId is null', async () => {
        mockRepo.updateAssignment.mockResolvedValue({ id: 'f1', assignedTo: null });

        const result = await findingService.assign('f1', null);

        expect(mockRepo.updateAssignment).toHaveBeenCalledWith('f1', null);
        expect(result.assignedTo).toBeNull();
      });
    });

    describe('❌ negative', () => {
      it('should propagate repository errors', async () => {
        mockRepo.updateAssignment.mockRejectedValue(new Error('DB error'));

        await expect(findingService.assign('f1', 'user-123')).rejects.toThrow('DB error');
      });
    });

    describe('🔲 edge cases', () => {
      it('should allow reassigning to different user', async () => {
        mockRepo.updateAssignment.mockResolvedValue({ id: 'f1', assignedTo: 'user-456' });

        const result = await findingService.assign('f1', 'user-456');

        expect(result.assignedTo).toBe('user-456');
      });

      it('should allow assigning to same user (idempotent)', async () => {
        mockRepo.updateAssignment.mockResolvedValue({ id: 'f1', assignedTo: 'user-123' });

        const result = await findingService.assign('f1', 'user-123');

        expect(result.assignedTo).toBe('user-123');
        expect(mockRepo.updateAssignment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('updateVerdict', () => {
    describe('✅ positive', () => {
      it('should update verdict to true_positive and set status to open', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1', filePath: 'src/app.ts', lineNumber: 1, scanner: 'semgrep', message: 'msg', severity: 'high', rule: 'rule-1' });
        mockRepo.updateGroupStatus.mockResolvedValue({ id: 'g1', status: 'open' });

        const result = await findingService.updateVerdict('f1', 'true_positive', 'user-123');

        expect(result).toBeDefined();
        expect(result.status).toBe('open');
        expect(mockRepo.updateGroupStatus).toHaveBeenCalledWith('g1', 'open', 'user-123');
      });

      it('should update verdict to false_positive and set status to resolved', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: 'g1', filePath: 'src/app.ts', lineNumber: 1, scanner: 'semgrep', message: 'msg', severity: 'high', rule: 'rule-1' });
        mockRepo.updateGroupStatus.mockResolvedValue({ id: 'g1', status: 'resolved' });

        const result = await findingService.updateVerdict('f1', 'false_positive', 'user-123');

        expect(result.status).toBe('resolved');
        expect(mockRepo.updateGroupStatus).toHaveBeenCalledWith('g1', 'resolved', 'user-123');
      });
    });

    describe('❌ negative', () => {
      it('should throw AppError for invalid verdict value', async () => {
        await expect(
          findingService.updateVerdict('f1', 'invalid', 'user-123')
        ).rejects.toThrow('Invalid verdict');
      });

      it('should throw when finding does not exist', async () => {
        mockRepo.findById.mockResolvedValue(null);

        await expect(
          findingService.updateVerdict('nonexistent', 'true_positive', 'user-123')
        ).rejects.toThrow();
      });

      it('should throw when finding has no group', async () => {
        mockRepo.findById.mockResolvedValue({ id: 'f1', groupId: null, filePath: null, lineNumber: null, scanner: null, message: null, severity: null, rule: null });

        await expect(
          findingService.updateVerdict('f1', 'true_positive', 'user-123')
        ).rejects.toThrow('Finding has no associated group');
      });
    });
  });

  describe('replaceFindingsForScanJob', () => {
    describe('✅ positive', () => {
      it('should return empty result when inputs array is empty', async () => {
        const result = await findingService.replaceFindingsForScanJob('proj-1', 'scan-1', []);

        expect(result).toEqual({ new: 0, persistent: 0, resolved: 0, findings: [] });
      });

      it('should create findings and groups for new scan job', async () => {
        mockFingerprint.mockReturnValue('fp-abc');
        mockRepo.findOrCreateFindingGroups.mockResolvedValue(new Map([
          ['fp-abc', { id: 'g1', isNew: true }],
        ]));
        mockRepo.createMany.mockResolvedValue([
          { id: 'f1', scanId: 'scan-1', groupId: 'g1', rule: 'rule-1', filePath: 'src/app.ts', message: 'msg' },
        ]);

        const result = await findingService.replaceFindingsForScanJob('proj-1', 'scan-1', [{
          scanId: 'scan-1', severity: 'high', filePath: 'src/app.ts',
          rule: 'rule-1', scanner: 'semgrep', message: 'msg',
        } as any]);

        expect(result.new).toBe(1);
        expect(result.persistent).toBe(0);
        expect(result.findings).toHaveLength(1);
        expect(mockRepo.createMany).toHaveBeenCalled();
      });
    });

    describe('❌ negative', () => {
      it('should propagate repository transaction errors', async () => {
        mockFingerprint.mockReturnValue('fp-abc');
        mockRepo.findOrCreateFindingGroups.mockRejectedValue(new Error('Transaction failed'));

        await expect(
          findingService.replaceFindingsForScanJob('proj-1', 'scan-1', [{
            scanId: 'scan-1', severity: 'high', filePath: 'src/app.ts',
            rule: 'rule-1', scanner: 'semgrep', message: 'msg',
          } as any])
        ).rejects.toThrow('Transaction failed');
      });
    });

    describe('🔲 edge cases', () => {
      it('should deduplicate findings with same fingerprint', async () => {
        mockFingerprint.mockReturnValue('fp-duplicate');
        mockRepo.findOrCreateFindingGroups.mockResolvedValue(new Map([
          ['fp-duplicate', { id: 'g1', isNew: true }],
        ]));
        mockRepo.createMany.mockResolvedValue([
          { id: 'f1', scanId: 'scan-1', groupId: 'g1', rule: 'rule-1', filePath: 'src/app.ts', message: 'msg' },
        ]);

        const result = await findingService.replaceFindingsForScanJob('proj-1', 'scan-1', [
          { scanId: 'scan-1', severity: 'high', filePath: 'src/app.ts', rule: 'rule-1', scanner: 'semgrep', message: 'msg' } as any,
          { scanId: 'scan-1', severity: 'high', filePath: 'src/app.ts', rule: 'rule-1', scanner: 'semgrep', message: 'msg' } as any,
        ]);

        // Only 1 finding created despite 2 inputs with same fingerprint
        expect(result.findings).toHaveLength(1);
      });
    });
  });
});
