import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/server/db/client', () => ({
  db: { insert: vi.fn(), select: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(() => ({})),
  inArray: vi.fn(),
  isNull: vi.fn(),
  ilike: vi.fn(),
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    scan: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  },
}));

vi.mock('@/lib/pagination', () => ({
  getOffset: vi.fn((page: number, perPage: number) => (page - 1) * perPage),
}));

vi.mock('@drizzle/schema/findings', () => ({
  findings: {},
  findingGroups: {},
  aiVerifications: {},
  findingHistory: {},
  findingGroupScans: {},
}));

vi.mock('@drizzle/schema/projects', () => ({
  projects: {},
}));

vi.mock('@drizzle/schema/scans', () => ({
  scans: {},
}));

vi.mock('@drizzle/schema/source-controls', () => ({
  repositories: {},
}));

vi.mock('@drizzle/schema/integrations', () => ({
  models: {},
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { db } from '@/server/db/client';
import {
  findings,
  findingGroups,
  aiVerifications,
  findingHistory,
  findingGroupScans,
} from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';

// ---------------------------------------------------------------------------
// DB chain helper
// ---------------------------------------------------------------------------

/**
 * Build a thenable mock chain that mimics Drizzle's fluent query builder.
 * Every method returns the same chain object; `await chain` resolves to
 * `resolveValue`.
 */
function createChain<T = unknown>(resolveValue: T) {
  const thenFn = (onfulfilled: (value: T) => unknown) =>
    Promise.resolve(resolveValue).then(onfulfilled);

  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    set: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
    then: vi.fn(thenFn),
    catch: vi.fn(),
    finally: vi.fn(),
  };

  return chain;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockFinding = {
  id: 'finding-1',
  scanId: 'scan-1',
  groupId: 'group-1',
  severity: 'high',
  filePath: 'src/app.ts',
  lineNumber: 42,
  scanner: 'semgrep',
  rule: 'rule-1',
  message: 'SQL injection',
  description: 'User input concatenated into SQL query',
  assignedTo: null,
  createdAt: new Date('2025-01-01'),
};

const mockGroup = {
  id: 'group-1',
  projectId: 'proj-1',
  repositoryId: 'repo-1',
  fingerprint: 'fp-1',
  title: 'SQL Injection in app.ts',
  status: 'open',
  firstSeenAt: new Date('2025-01-01'),
  lastSeenAt: new Date('2025-01-01'),
};

const mockVerification = {
  id: 'ver-1',
  findingId: 'finding-1',
  groupId: 'group-1',
  verdict: 'true_positive',
  confidence: 'high',
  explanation: 'Confirmed by pattern match',
  createdAt: new Date('2025-01-02'),
  modelId: 'model-1',
};

const mockModel = {
  id: 'model-1',
  name: 'gpt-4',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findingRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // createMany
  // -----------------------------------------------------------------------
  describe('createMany', () => {
    describe('✅ positive', () => {
      it('should batch insert findings and return created records', async () => {
        const created = [
          { id: 'f1', scanId: 's1', severity: 'high' },
          { id: 'f2', scanId: 's1', severity: 'medium' },
        ];
        const chain = createChain(created);
        vi.mocked(db.insert).mockReturnValue(chain as any);

        const input = [
          { scanId: 's1', severity: 'high' },
          { scanId: 's1', severity: 'medium' },
        ];
        const result = await findingRepository.createMany(input);

        expect(result).toEqual(created);
        expect(db.insert).toHaveBeenCalledWith(findings);
        expect(chain.values).toHaveBeenCalledWith(input);
        expect(chain.returning).toHaveBeenCalledOnce();
      });
    });

    describe('❌ negative', () => {
      it('should return empty array when given empty input', async () => {
        const result = await findingRepository.createMany([]);
        expect(result).toEqual([]);
        expect(db.insert).not.toHaveBeenCalled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    describe('✅ positive', () => {
      it('should return finding when found by ID', async () => {
        const chain = createChain([mockFinding]);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.findById('finding-1');

        expect(result).toEqual(mockFinding);
        expect(db.select).toHaveBeenCalled();
        expect(chain.from).toHaveBeenCalledWith(findings);
        expect(chain.where).toHaveBeenCalledOnce();
        expect(chain.limit).toHaveBeenCalledWith(1);
      });
    });

    describe('❌ negative', () => {
      it('should return null when finding not found', async () => {
        const chain = createChain([] as typeof mockFinding[]);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.findById('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  // -----------------------------------------------------------------------
  // findGroupById
  // -----------------------------------------------------------------------
  describe('findGroupById', () => {
    describe('✅ positive', () => {
      it('should return finding group when found by ID', async () => {
        const chain = createChain([mockGroup]);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.findGroupById('group-1');

        expect(result).toEqual(mockGroup);
        expect(db.select).toHaveBeenCalled();
        expect(chain.from).toHaveBeenCalledWith(findingGroups);
        expect(chain.where).toHaveBeenCalledOnce();
        expect(chain.limit).toHaveBeenCalledWith(1);
      });
    });

    describe('❌ negative', () => {
      it('should return null when group not found', async () => {
        const chain = createChain([] as typeof mockGroup[]);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.findGroupById('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  // -----------------------------------------------------------------------
  // getVerifications
  // -----------------------------------------------------------------------
  describe('getVerifications', () => {
    describe('✅ positive', () => {
      it('should return verifications ordered by newest first', async () => {
        const older = { ...mockVerification, id: 'ver-1', createdAt: new Date('2025-01-01') };
        const newer = { ...mockVerification, id: 'ver-2', createdAt: new Date('2025-01-03') };
        const verifications = [newer, older];

        const chain = createChain(verifications);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.getVerifications('finding-1');

        expect(result).toEqual(verifications);
        expect(db.select).toHaveBeenCalled();
        expect(chain.from).toHaveBeenCalledWith(aiVerifications);
        expect(chain.where).toHaveBeenCalledOnce();
        expect(chain.orderBy).toHaveBeenCalledOnce();
      });
    });

    describe('❌ negative', () => {
      it('should return empty array when no verifications exist', async () => {
        const chain = createChain([]);
        vi.mocked(db.select).mockReturnValue(chain as any);

        const result = await findingRepository.getVerifications('finding-1');

        expect(result).toEqual([]);
      });
    });
  });

  // -----------------------------------------------------------------------
  // listByProject (non-verdict path)
  // -----------------------------------------------------------------------
  describe('listByProject', () => {
    const defaultParams = { page: 1, perPage: 20 };

    describe('✅ positive', () => {
      it('should return paginated findings enriched with AI data', async () => {
        const dataRow = {
          id: 'finding-1',
          scanId: 'scan-1',
          groupId: 'group-1',
          cweId: null,
          severity: 'high',
          groupStatus: 'open',
          filePath: 'src/app.ts',
          lineNumber: 42,
          codeSnippet: null,
          description: 'SQL injection',
          rule: 'rule-1',
          scanner: 'semgrep',
          message: 'SQL injection',
          assignedTo: null,
          createdAt: new Date('2025-01-01'),
          firstSeenAt: new Date('2025-01-01'),
          repositoryName: 'my-repo',
        };

        const dataChain = createChain([dataRow]);
        const aiVerChain = createChain([] as Array<Record<string, unknown>>);
        const countChain = createChain([{ total: 1 }]);

        // 4 select calls: data, verifications, models (skipped), count
        vi.mocked(db.select)
          .mockImplementationOnce(() => dataChain as any) // main data
          .mockImplementationOnce(() => aiVerChain as any) // AI verifications
          .mockImplementationOnce(() => countChain as any); // count

        const result = await findingRepository.listByProject(
          'proj-1',
          defaultParams,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: 'finding-1',
          severity: 'high',
          verdict: 'Pending',
          groupStatus: 'open',
        });
        expect(result.total).toBe(1);

        // Verify chain structure was called
        expect(dataChain.from).toHaveBeenCalledWith(findings);
        expect(dataChain.innerJoin).toHaveBeenCalled();
        expect(dataChain.where).toHaveBeenCalled();
        expect(dataChain.orderBy).toHaveBeenCalled();
        expect(dataChain.limit).toHaveBeenCalledWith(20);
        expect(dataChain.offset).toHaveBeenCalledWith(0);
      });
    });

    describe('❌ negative', () => {
      it('should return empty data and total 0 when no findings exist', async () => {
        const dataChain = createChain([] as Array<Record<string, unknown>>);
        const countChain = createChain([{ total: 0 }]);

        vi.mocked(db.select)
          .mockImplementationOnce(() => dataChain as any)
          .mockImplementationOnce(() => countChain as any);

        const result = await findingRepository.listByProject(
          'proj-1',
          defaultParams,
        );

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });
  });

  // -----------------------------------------------------------------------
  // listByScan (non-verdict path)
  // -----------------------------------------------------------------------
  describe('listByScan', () => {
    const defaultParams = { page: 1, perPage: 20 };

    describe('✅ positive', () => {
      it('should return findings for a scan with AI enrichment', async () => {
        const dataRow = {
          id: 'finding-1',
          scanId: 'scan-1',
          groupId: 'group-1',
          cweId: null,
          severity: 'high',
          groupStatus: 'open',
          filePath: 'src/app.ts',
          lineNumber: 42,
          codeSnippet: null,
          description: 'SQL injection',
          rule: 'rule-1',
          scanner: 'semgrep',
          message: 'SQL injection',
          assignedTo: null,
          createdAt: new Date('2025-01-01'),
          firstSeenAt: new Date('2025-01-01'),
          repositoryName: 'my-repo',
          isNew: true,
        };

        const dataChain = createChain([dataRow]);
        const aiVerChain = createChain([] as Array<Record<string, unknown>>);
        const countChain = createChain([{ total: 5 }]);

        vi.mocked(db.select)
          .mockImplementationOnce(() => dataChain as any)
          .mockImplementationOnce(() => aiVerChain as any)
          .mockImplementationOnce(() => countChain as any);

        const result = await findingRepository.listByScan(
          'scan-1',
          defaultParams,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('finding-1');
        expect(result.data[0].isNew).toBe(true);
        expect(result.total).toBe(5);

        expect(dataChain.from).toHaveBeenCalledWith(findings);
        expect(dataChain.leftJoin).toHaveBeenCalled(); // findingGroupScans left join
      });
    });

    describe('❌ negative', () => {
      it('should return empty data and total 0 when scan has no findings', async () => {
        const dataChain = createChain([] as Array<Record<string, unknown>>);
        const countChain = createChain([{ total: 0 }]);

        vi.mocked(db.select)
          .mockImplementationOnce(() => dataChain as any)
          .mockImplementationOnce(() => countChain as any);

        const result = await findingRepository.listByScan('scan-1', defaultParams);

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateGroupStatus
  // -----------------------------------------------------------------------
  describe('updateGroupStatus', () => {
    describe('✅ positive', () => {
      it('should update group status and insert history when finding exists', async () => {
        const oldGroupChain = createChain([{ status: 'open' }]);
        const updateChain = createChain([{ id: 'group-1', status: 'resolved' }]);
        const firstFindingChain = createChain([{ id: 'finding-1' }]);
        const historyChain = createChain([] as Array<Record<string, unknown>>);

        vi.mocked(db.select)
          .mockImplementationOnce(() => oldGroupChain as any)
          .mockImplementationOnce(() => firstFindingChain as any);
        vi.mocked(db.update)
          .mockImplementationOnce(() => updateChain as any);
        vi.mocked(db.insert)
          .mockImplementationOnce(() => historyChain as any);

        const result = await findingRepository.updateGroupStatus(
          'group-1',
          'resolved',
          'user-1',
        );

        expect(result).toMatchObject({ id: 'group-1', status: 'resolved' });

        // Verify history was recorded
        expect(db.insert).toHaveBeenCalledWith(findingHistory);
        expect(historyChain.values).toHaveBeenCalledWith(
          expect.objectContaining({
            findingId: 'finding-1',
            field: 'group_status',
            oldValue: 'open',
            newValue: 'resolved',
            createdBy: 'user-1',
          }),
        );
      });
    });

    describe('❌ negative', () => {
      it('should not insert history when no old group found', async () => {
        const oldGroupChain = createChain([] as Array<Record<string, unknown>>);
        const updateChain = createChain([{ id: 'group-1', status: 'resolved' }]);

        vi.mocked(db.select).mockImplementationOnce(() => oldGroupChain as any);
        vi.mocked(db.update).mockImplementationOnce(() => updateChain as any);

        const result = await findingRepository.updateGroupStatus(
          'group-1',
          'resolved',
          'user-1',
        );

        expect(result).toMatchObject({ id: 'group-1', status: 'resolved' });
        expect(db.insert).not.toHaveBeenCalled();
      });

      it('should not insert history when no finding in group', async () => {
        const oldGroupChain = createChain([{ status: 'open' }]);
        const updateChain = createChain([{ id: 'group-1', status: 'resolved' }]);
        const noFindingChain = createChain([] as Array<Record<string, unknown>>);

        vi.mocked(db.select)
          .mockImplementationOnce(() => oldGroupChain as any)
          .mockImplementationOnce(() => noFindingChain as any);
        vi.mocked(db.update).mockImplementationOnce(() => updateChain as any);

        const result = await findingRepository.updateGroupStatus(
          'group-1',
          'resolved',
          null,
        );

        expect(result).toMatchObject({ id: 'group-1', status: 'resolved' });
        expect(db.insert).not.toHaveBeenCalled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateGroupsStatusBulk
  // -----------------------------------------------------------------------
  describe('updateGroupsStatusBulk', () => {
    describe('✅ positive', () => {
      it('should update status for multiple group IDs', async () => {
        const chain = createChain(undefined as void);
        vi.mocked(db.update).mockReturnValue(chain as any);

        await findingRepository.updateGroupsStatusBulk(
          ['group-1', 'group-2'],
          'dismissed',
        );

        expect(db.update).toHaveBeenCalledWith(findingGroups);
        expect(chain.set).toHaveBeenCalledWith({ status: 'dismissed' });
        expect(chain.where).toHaveBeenCalledOnce();
      });
    });

    describe('❌ negative', () => {
      it('should not call update when groupIds is empty', async () => {
        await findingRepository.updateGroupsStatusBulk([], 'dismissed');
        expect(db.update).not.toHaveBeenCalled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateAssignment
  // -----------------------------------------------------------------------
  describe('updateAssignment', () => {
    describe('✅ positive', () => {
      it('should assign finding to a user', async () => {
        const updated = { id: 'finding-1', assignedTo: 'user-1', updatedAt: new Date() };
        const chain = createChain([updated]);
        vi.mocked(db.update).mockReturnValue(chain as any);

        const result = await findingRepository.updateAssignment('finding-1', 'user-1');

        expect(result).toEqual(updated);
        expect(db.update).toHaveBeenCalledWith(findings);
        expect(chain.set).toHaveBeenCalledWith(
          expect.objectContaining({ assignedTo: 'user-1' }),
        );
        expect(chain.where).toHaveBeenCalledOnce();
        expect(chain.returning).toHaveBeenCalled();
      });

      it('should unassign a finding (set assignedTo to null)', async () => {
        const updated = { id: 'finding-1', assignedTo: null, updatedAt: new Date() };
        const chain = createChain([updated]);
        vi.mocked(db.update).mockReturnValue(chain as any);

        const result = await findingRepository.updateAssignment('finding-1', null);

        expect(result).toEqual(updated);
        expect(chain.set).toHaveBeenCalledWith(
          expect.objectContaining({ assignedTo: null }),
        );
      });
    });

    describe('❌ negative', () => {
      it('should return undefined when finding not found', async () => {
        const chain = createChain([] as Array<Record<string, unknown>>);
        vi.mocked(db.update).mockReturnValue(chain as any);

        const result = await findingRepository.updateAssignment('nonexistent', 'user-1');

        expect(result).toBeUndefined();
      });
    });
  });

  // -----------------------------------------------------------------------
  // findOrCreateFindingGroups
  // -----------------------------------------------------------------------
  describe('findOrCreateFindingGroups', () => {
    const entries = [
      { fingerprint: 'fp-1', title: 'Finding 1' },
      { fingerprint: 'fp-2', title: 'Finding 2' },
    ];

    describe('✅ positive', () => {
      it('should insert new groups and return them with isNew=true', async () => {
        // Step 1: Insert → onConflictDoNothing → returning fingerprints
        const insertChain = createChain([
          { fingerprint: 'fp-1' },
          { fingerprint: 'fp-2' },
        ]);
        // Step 2: Select existing groups
        const selectChain = createChain([
          { id: 'g1', fingerprint: 'fp-1', status: 'open' },
          { id: 'g2', fingerprint: 'fp-2', status: 'open' },
        ]);
        // Step 3: Update lastSeenAt (no reopening since none are resolved)
        const updateChain1 = createChain(undefined as void);
        // Step 4: Insert into finding_group_scans
        const fgsInsertChain = createChain([] as Array<Record<string, unknown>>);

        vi.mocked(db.insert)
          .mockImplementationOnce(() => insertChain as any)
          .mockImplementationOnce(() => fgsInsertChain as any);
        vi.mocked(db.select).mockImplementationOnce(() => selectChain as any);
        vi.mocked(db.update).mockImplementationOnce(() => updateChain1 as any);

        const result = await findingRepository.findOrCreateFindingGroups(
          'proj-1',
          'repo-1',
          entries,
          'scan-1',
        );

        expect(result.size).toBe(2);
        expect(result.get('fp-1')).toMatchObject({
          id: 'g1',
          fingerprint: 'fp-1',
          status: 'open',
          isNew: true,
        });
        expect(result.get('fp-2')).toMatchObject({
          id: 'g2',
          fingerprint: 'fp-2',
          status: 'open',
          isNew: true,
        });

        // Verify insert chain
        expect(insertChain.values).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ fingerprint: 'fp-1', title: 'Finding 1' }),
          ]),
        );
        expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
        expect(insertChain.returning).toHaveBeenCalled();

        // Verify finding_group_scans insert
        expect(fgsInsertChain.values).toHaveBeenCalled();
        expect(fgsInsertChain.onConflictDoNothing).toHaveBeenCalled();
      });

      it('should reopen resolved groups and mark them as not new', async () => {
        // Step 1: Insert → onConflictDoNothing → returning (none new)
        const insertChain = createChain([] as Array<Record<string, unknown>>);
        // Step 2: Select existing groups (one is resolved)
        const selectChain = createChain([
          { id: 'g1', fingerprint: 'fp-1', status: 'resolved' },
        ]);
        // Step 3: Update to reopen resolved groups
        const reopenChain = createChain(undefined as void);
        // Step 4: Update lastSeenAt for all groups
        const lastSeenChain = createChain(undefined as void);
        // Step 5: Insert into finding_group_scans
        const fgsInsertChain = createChain([] as Array<Record<string, unknown>>);

        vi.mocked(db.insert)
          .mockImplementationOnce(() => insertChain as any)
          .mockImplementationOnce(() => fgsInsertChain as any);
        vi.mocked(db.select).mockImplementationOnce(() => selectChain as any);
        vi.mocked(db.update)
          .mockImplementationOnce(() => reopenChain as any)
          .mockImplementationOnce(() => lastSeenChain as any);

        const result = await findingRepository.findOrCreateFindingGroups(
          'proj-1',
          'repo-1',
          [{ fingerprint: 'fp-1', title: 'Existing Finding' }],
          'scan-1',
        );

        expect(result.size).toBe(1);
        expect(result.get('fp-1')).toMatchObject({
          id: 'g1',
          fingerprint: 'fp-1',
          status: 'open',
          isNew: false,
        });

        expect(reopenChain.set).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'open' }),
        );
      });
    });

    describe('❌ negative', () => {
      it('should return empty map when entries array is empty', async () => {
        const result = await findingRepository.findOrCreateFindingGroups(
          'proj-1',
          null,
          [],
        );

        expect(result.size).toBe(0);
        expect(db.insert).not.toHaveBeenCalled();
        expect(db.select).not.toHaveBeenCalled();
      });

      it('should skip finding_group_scans insert when scanId is not provided', async () => {
        const insertChain = createChain([
          { fingerprint: 'fp-1' },
        ]);
        const selectChain = createChain([
          { id: 'g1', fingerprint: 'fp-1', status: 'open' },
        ]);
        const updateChain = createChain(undefined as void);

        vi.mocked(db.insert).mockImplementationOnce(() => insertChain as any);
        vi.mocked(db.select).mockImplementationOnce(() => selectChain as any);
        vi.mocked(db.update).mockImplementationOnce(() => updateChain as any);

        const result = await findingRepository.findOrCreateFindingGroups(
          'proj-1',
          'repo-1',
          [{ fingerprint: 'fp-1', title: 'Finding' }],
        );

        expect(result.size).toBe(1);
        // Second db.insert (for finding_group_scans) should NOT be called
        expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(1);
      });
    });
  });
});
