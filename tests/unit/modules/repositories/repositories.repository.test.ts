import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/server/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', column: a, value: b })),
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  isNull: vi.fn((a) => ({ type: 'isNull', column: a })),
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    repository: {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  },
}));

vi.mock('@drizzle/schema/source-controls', () => ({
  repositories: {
    id: 'id',
    workspaceId: 'workspaceId',
    projectId: 'projectId',
    name: 'name',
    url: 'url',
    defaultBranch: 'defaultBranch',
    connectionType: 'connectionType',
    autoScan: 'autoScan',
    deletedAt: 'deletedAt',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

// ---------------------------------------------------------------------------
// Imports (resolved after mocks)
// ---------------------------------------------------------------------------

import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';
import { eq, and, isNull } from 'drizzle-orm';
import type { repositoriesRepository as RepoRepositoryType } from '@/server/modules/repositories/repositories.repository';

// ---------------------------------------------------------------------------
// Drizzle chain builders
// ---------------------------------------------------------------------------

function selectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  };
}

function selectWithLimitChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function insertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  };
}

function updateChain(returned: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(returned),
      }),
    }),
  };
}

function updateNoReturnChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function failingChain(reason: Error) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(reason),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('repositoriesRepository', () => {
  let repositoriesRepository: typeof RepoRepositoryType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/server/modules/repositories/repositories.repository');
    repositoriesRepository = mod.repositoriesRepository;
  });

  // --------------------------------------------------
  // listByWorkspace
  // --------------------------------------------------
  describe('listByWorkspace', () => {
    describe('positive', () => {
      it('should return all non-deleted repositories for a workspace', async () => {
        const mockRepos = [
          { id: 'r1', name: 'repo-a', workspaceId: 'ws-1', deletedAt: null },
          { id: 'r2', name: 'repo-b', workspaceId: 'ws-1', deletedAt: null },
        ];
        vi.mocked(db.select).mockReturnValue(selectChain(mockRepos));

        const result = await repositoriesRepository.listByWorkspace('ws-1');

        expect(result).toEqual(mockRepos);
        expect(db.select).toHaveBeenCalledWith();
      });

      it('should filter by workspaceId and exclude soft-deleted records', async () => {
        vi.mocked(db.select).mockReturnValue(selectChain([]));

        await repositoriesRepository.listByWorkspace('ws-1');

        expect(eq).toHaveBeenCalledWith(repositories.workspaceId, 'ws-1');
        expect(isNull).toHaveBeenCalledWith(repositories.deletedAt);
        expect(and).toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should return empty array when workspace has no repositories', async () => {
        vi.mocked(db.select).mockReturnValue(selectChain([]));

        const result = await repositoriesRepository.listByWorkspace('ws-empty');

        expect(result).toEqual([]);
      });
    });
  });

  // --------------------------------------------------
  // getById
  // --------------------------------------------------
  describe('getById', () => {
    describe('positive', () => {
      it('should return repository when found by id and workspace', async () => {
        const mockRepo = { id: 'r1', name: 'test-repo', workspaceId: 'ws-1', deletedAt: null };
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([mockRepo]));

        const result = await repositoriesRepository.getById('r1', 'ws-1');

        expect(result).toEqual(mockRepo);
      });

      it('should query with id, workspaceId, and non-deleted conditions', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([{ id: 'r1' }]));

        await repositoriesRepository.getById('r1', 'ws-1');

        expect(eq).toHaveBeenCalledWith(repositories.id, 'r1');
        expect(eq).toHaveBeenCalledWith(repositories.workspaceId, 'ws-1');
        expect(isNull).toHaveBeenCalledWith(repositories.deletedAt);
      });
    });

    describe('negative', () => {
      it('should return null when repository does not exist', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([]));

        const result = await repositoriesRepository.getById('nonexistent', 'ws-1');

        expect(result).toBeNull();
      });
    });
  });

  // --------------------------------------------------
  // create
  // --------------------------------------------------
  describe('create', () => {
    const input = {
      workspaceId: 'ws-1',
      projectId: 'p1',
      name: 'new-repo',
      url: 'https://example.com/repo.git',
    };

    describe('positive', () => {
      it('should create and return repository with default values', async () => {
        const created = { id: 'r1', ...input, defaultBranch: 'main', connectionType: ['scm'], autoScan: false };
        vi.mocked(db.insert).mockReturnValue(insertChain([created]));

        const result = await repositoriesRepository.create(input);

        expect(result).toEqual(created);
        expect(db.insert).toHaveBeenCalledWith(repositories);
      });

      it('should set createdBy and updatedBy when createdBy is provided', async () => {
        vi.mocked(db.insert).mockReturnValue(insertChain([{ id: 'r1' }]));

        await repositoriesRepository.create({ ...input, createdBy: 'u1' });

        const valuesFn = vi.mocked(db.insert).mock.results[0]?.value?.values;
        expect(valuesFn).toHaveBeenCalled();
        const vals = valuesFn.mock.calls[0][0];
        expect(vals.createdBy).toBe('u1');
        expect(vals.updatedBy).toBe('u1');
      });

      it('should respect provided optional fields over defaults', async () => {
        vi.mocked(db.insert).mockReturnValue(insertChain([{ id: 'r2' }]));

        await repositoriesRepository.create({
          ...input,
          defaultBranch: 'develop',
          connectionType: ['scm', 'webhook'],
          autoScan: true,
        });

        const valuesFn = vi.mocked(db.insert).mock.results[0]?.value?.values;
        const vals = valuesFn.mock.calls[0][0];
        expect(vals.defaultBranch).toBe('develop');
        expect(vals.connectionType).toEqual(['scm', 'webhook']);
        expect(vals.autoScan).toBe(true);
      });

      it('should use transaction object when tx is passed', async () => {
        const mockTx = { insert: vi.fn().mockReturnValue(insertChain([{ id: 'r1' }])), select: vi.fn(), update: vi.fn(), delete: vi.fn() };

        const result = await repositoriesRepository.create(input, mockTx as never);

        expect(result).toEqual({ id: 'r1' });
        expect(mockTx.insert).toHaveBeenCalledWith(repositories);
        expect(db.insert).not.toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should throw when database insert fails', async () => {
        const error = new Error('insert failure');
        vi.mocked(db.insert).mockReturnValue(failingChain(error));

        await expect(repositoriesRepository.create(input)).rejects.toThrow('insert failure');
      });
    });
  });

  // --------------------------------------------------
  // update
  // --------------------------------------------------
  describe('update', () => {
    describe('positive', () => {
      it('should update and return the repository', async () => {
        const updated = { id: 'r1', name: 'renamed', workspaceId: 'ws-1' };
        vi.mocked(db.update).mockReturnValue(updateChain([updated]));

        const result = await repositoriesRepository.update('r1', { name: 'renamed' });

        expect(result).toEqual(updated);
        expect(db.update).toHaveBeenCalledWith(repositories);
      });

      it('should set updatedAt to current date', async () => {
        const before = new Date(Date.now() - 1000);
        vi.mocked(db.update).mockReturnValue(updateChain([{ id: 'r1' }]));

        await repositoriesRepository.update('r1', { name: 'renamed' });

        const setFn = vi.mocked(db.update).mock.results[0]?.value?.set;
        const values = setFn.mock.calls[0][0];
        expect(values.updatedAt).toBeInstanceOf(Date);
        expect(values.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(values.name).toBe('renamed');
      });

      it('should use transaction when tx is passed', async () => {
        const mockTx = { update: vi.fn().mockReturnValue(updateChain([{ id: 'r1' }])), insert: vi.fn(), select: vi.fn(), delete: vi.fn() };

        const result = await repositoriesRepository.update('r1', { name: 'renamed' }, mockTx as never);

        expect(result).toEqual({ id: 'r1' });
        expect(mockTx.update).toHaveBeenCalledWith(repositories);
        expect(db.update).not.toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should return null when repository to update does not exist', async () => {
        vi.mocked(db.update).mockReturnValue(updateChain([]));

        const result = await repositoriesRepository.update('nonexistent', { name: 'nope' });

        expect(result).toBeNull();
      });

      it('should throw when database update fails', async () => {
        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockRejectedValue(new Error('update failed')),
            }),
          }),
        });

        await expect(repositoriesRepository.update('r1', { name: 'x' })).rejects.toThrow('update failed');
      });
    });
  });

  // --------------------------------------------------
  // delete (soft)
  // --------------------------------------------------
  describe('delete', () => {
    describe('positive', () => {
      it('should soft-delete by setting deletedAt to current date', async () => {
        const before = new Date(Date.now() - 1000);
        vi.mocked(db.update).mockReturnValue(updateNoReturnChain());

        await repositoriesRepository.delete('r1');

        const setFn = vi.mocked(db.update).mock.results[0]?.value?.set;
        const values = setFn.mock.calls[0][0];
        expect(values.deletedAt).toBeInstanceOf(Date);
        expect(values.deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });

      it('should target the correct repository by id', async () => {
        vi.mocked(db.update).mockReturnValue(updateNoReturnChain());

        await repositoriesRepository.delete('r1');

        expect(db.update).toHaveBeenCalledWith(repositories);
      });

      it('should use transaction when tx is passed', async () => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn(),
          select: vi.fn(),
          delete: vi.fn(),
        };

        await repositoriesRepository.delete('r1', mockTx as never);

        expect(mockTx.update).toHaveBeenCalledWith(repositories);
        expect(db.update).not.toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should throw when database delete fails', async () => {
        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('delete failed')),
          }),
        });

        await expect(repositoriesRepository.delete('r1')).rejects.toThrow('delete failed');
      });
    });
  });

  // --------------------------------------------------
  // findByUrl
  // --------------------------------------------------
  describe('findByUrl', () => {
    describe('positive', () => {
      it('should return repository when found by url within workspace', async () => {
        const mockRepo = { id: 'r1', url: 'https://example.com/repo.git', workspaceId: 'ws-1', deletedAt: null };
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([mockRepo]));

        const result = await repositoriesRepository.findByUrl('https://example.com/repo.git', 'ws-1');

        expect(result).toEqual(mockRepo);
      });

      it('should query with url, workspaceId, and non-deleted conditions', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([{ id: 'r1' }]));

        await repositoriesRepository.findByUrl('https://example.com/repo.git', 'ws-1');

        expect(eq).toHaveBeenCalledWith(repositories.url, 'https://example.com/repo.git');
        expect(eq).toHaveBeenCalledWith(repositories.workspaceId, 'ws-1');
        expect(isNull).toHaveBeenCalledWith(repositories.deletedAt);
      });

      it('should use transaction when tx is passed', async () => {
        const mockTx = { select: vi.fn().mockReturnValue(selectWithLimitChain([{ id: 'r1' }])), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };

        const result = await repositoriesRepository.findByUrl('https://example.com/repo.git', 'ws-1', mockTx as never);

        expect(result).toEqual({ id: 'r1' });
        expect(mockTx.select).toHaveBeenCalledWith();
        expect(db.select).not.toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should return null when no repository matches the url', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([]));

        const result = await repositoriesRepository.findByUrl('https://example.com/unknown.git', 'ws-1');

        expect(result).toBeNull();
      });
    });
  });

  // --------------------------------------------------
  // findByNameAndWorkspace
  // --------------------------------------------------
  describe('findByNameAndWorkspace', () => {
    describe('positive', () => {
      it('should return repository when found by name within workspace', async () => {
        const mockRepo = { id: 'r1', name: 'test-repo', workspaceId: 'ws-1', deletedAt: null };
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([mockRepo]));

        const result = await repositoriesRepository.findByNameAndWorkspace('test-repo', 'ws-1');

        expect(result).toEqual(mockRepo);
      });

      it('should query with name, workspaceId, and non-deleted conditions', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([{ id: 'r1' }]));

        await repositoriesRepository.findByNameAndWorkspace('test-repo', 'ws-1');

        expect(eq).toHaveBeenCalledWith(repositories.name, 'test-repo');
        expect(eq).toHaveBeenCalledWith(repositories.workspaceId, 'ws-1');
        expect(isNull).toHaveBeenCalledWith(repositories.deletedAt);
      });

      it('should use transaction when tx is passed', async () => {
        const mockTx = { select: vi.fn().mockReturnValue(selectWithLimitChain([{ id: 'r1' }])), insert: vi.fn(), update: vi.fn(), delete: vi.fn() };

        const result = await repositoriesRepository.findByNameAndWorkspace('test-repo', 'ws-1', mockTx as never);

        expect(result).toEqual({ id: 'r1' });
        expect(mockTx.select).toHaveBeenCalledWith();
        expect(db.select).not.toHaveBeenCalled();
      });
    });

    describe('negative', () => {
      it('should return null when no repository matches the name in the workspace', async () => {
        vi.mocked(db.select).mockReturnValue(selectWithLimitChain([]));

        const result = await repositoriesRepository.findByNameAndWorkspace('nonexistent', 'ws-1');

        expect(result).toBeNull();
      });
    });
  });
});
