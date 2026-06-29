/**
 * Unit tests for repositoriesService (Repository Management)
 *
 * Tests the business logic layer for:
 * - Listing repositories
 * - Getting repository by ID
 * - Creating repositories
 * - Updating repositories
 * - Deleting repositories
 *
 * Focus is on permission checks, workspace scoping, and ownership rules.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repositoriesService } from '@/server/modules/repositories/repositories.service';

vi.mock('@/server/modules/repositories/repositories.repository', () => ({
  repositoriesRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByName: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    repository: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    workspace: { debug: vi.fn() },
    audit: { warn: vi.fn() },
  },
}));

import { repositoriesRepository } from '@/server/modules/repositories/repositories.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';

describe('repositoriesService', () => {
  const wsId = 'ws-1';
  const userId = 'user-1';
  const repoId = 'repo-1';

  beforeEach(() => { vi.clearAllMocks(); });

  // --------------------------------------------------
  // list
  // --------------------------------------------------
  describe('list', () => {
    it('should return repositories for a workspace', async () => {
      vi.mocked(repositoriesRepository.list).mockResolvedValue([
        { id: 'r1', name: 'repo-a' },
        { id: 'r2', name: 'repo-b' },
      ]);

      const result = await repositoriesService.list(wsId);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when workspace has no repositories', async () => {
      vi.mocked(repositoriesRepository.list).mockResolvedValue([]);
      const result = await repositoriesService.list(wsId);
      expect(result).toHaveLength(0);
    });
  });

  // --------------------------------------------------
  // getById
  // --------------------------------------------------
  describe('getById', () => {
    it('should get repository by ID', async () => {
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: repoId, name: 'test-repo' });
      const result = await repositoriesService.getById(wsId, repoId);
      expect(result.id).toBe(repoId);
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(undefined);
      await expect(
        repositoriesService.getById(wsId, 'nonexistent')
      ).rejects.toThrow('Repository not found');
    });
  });

  // --------------------------------------------------
  // create
  // --------------------------------------------------
  describe('create', () => {
    it('should create repository when user is member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('member');
      vi.mocked(repositoriesRepository.findByName).mockResolvedValue(null);
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: repoId, name: 'new-repo' });

      const result = await repositoriesService.create(wsId, {
        projectId: 'proj-1',
        name: 'new-repo',
        url: 'https://github.com/org/repo',
      }, userId);

      expect(result.name).toBe('new-repo');
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.create(wsId, { name: 'new', projectId: 'p1', url: 'http://test.com' }, userId)
      ).rejects.toThrow('You are not a member');
    });

  });

  // --------------------------------------------------
  // update
  // --------------------------------------------------
  describe('update', () => {
    it('should update repository when user is member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('member');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: repoId, name: 'old' });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: repoId, name: 'new-name' });

      const result = await repositoriesService.update(wsId, repoId, { name: 'new-name' }, userId);
      expect(result.name).toBe('new-name');
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.update(wsId, repoId, { name: 'new' }, userId)
      ).rejects.toThrow('You are not a member');
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('member');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(undefined);

      await expect(
        repositoriesService.update(wsId, 'nonexistent', { name: 'new' }, userId)
      ).rejects.toThrow('Repository not found');
    });
  });

  // --------------------------------------------------
  // delete
  // --------------------------------------------------
  describe('delete', () => {
    it('should delete repository when user is member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('member');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: repoId, name: 'repo' });
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      const result = await repositoriesService.delete(wsId, repoId, userId);
      expect(result.id).toBe(repoId);
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.delete(wsId, repoId, userId)
      ).rejects.toThrow('You are not a member');
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('member');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(undefined);

      await expect(
        repositoriesService.delete(wsId, 'nonexistent', userId)
      ).rejects.toThrow('Repository not found');
    });
  });

  // --------------------------------------------------
  // edge cases
  // --------------------------------------------------
  describe('edge cases', () => {
    it('should allow owner to create', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.findByName).mockResolvedValue(null);
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: 'r1', name: 'repo' });

      const result = await repositoriesService.create(wsId, { projectId: 'p1', name: 'repo', url: 'http://test.com' }, userId);
      expect(result.id).toBe('r1');
    });

    it('should allow manager to create', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('manager');
      vi.mocked(repositoriesRepository.findByName).mockResolvedValue(null);
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: 'r1', name: 'repo' });

      const result = await repositoriesService.create(wsId, { projectId: 'p1', name: 'repo', url: 'http://test.com' }, userId);
      expect(result.id).toBe('r1');
    });

    it('should update with partial fields', async () => {
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: repoId, name: 'repo' });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: repoId, defaultBranch: 'main' });

      const result = await repositoriesService.update(wsId, repoId, { defaultBranch: 'main' }, userId);
      expect(result.defaultBranch).toBe('main');
    });
  });
});
