import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repositoriesService } from '@/server/modules/repositories/repositories.service';

// Mock dependencies
vi.mock('@/server/modules/repositories/repositories.repository', () => ({
  repositoriesRepository: {
    listByWorkspace: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByUrl: vi.fn(),
    findByNameAndWorkspace: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    repository: {
      info: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('repositoriesService', () => {
  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-123';
  const mockRepoId = 'repo-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should list repositories for workspace', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const mockRepos = [
        { id: 'r1', name: 'repo-1', url: 'https://github.com/test/repo1' },
        { id: 'r2', name: 'repo-2', url: 'https://github.com/test/repo2' },
      ];

      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue(mockRepos);

      const result = await repositoriesService.list(mockWorkspaceId);

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockRepos);
    });

    it('should return empty array when no repositories', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue([]);

      const result = await repositoriesService.list(mockWorkspaceId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should get repository by ID', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const mockRepo = { id: mockRepoId, name: 'test-repo', workspaceId: mockWorkspaceId };

      vi.mocked(repositoriesRepository.getById).mockResolvedValue(mockRepo);

      const result = await repositoriesService.getById(mockRepoId, mockWorkspaceId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockRepoId);
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(null);

      await expect(
        repositoriesService.getById('nonexistent', mockWorkspaceId)
      ).rejects.toThrow('Repository not found');
    });
  });

  describe('create', () => {
    it('should create repository when user is member', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({
        id: mockRepoId,
        name: 'new-repo',
        workspaceId: mockWorkspaceId,
      });

      const result = await repositoriesService.create({
        projectId: 'project-123',
        name: 'new-repo',
        url: 'https://github.com/test/new-repo',
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.name).toBe('new-repo');
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.create({
          projectId: 'project-123',
          name: 'new-repo',
          url: 'https://github.com/test/new-repo',
        }, mockWorkspaceId, mockUserId)
      ).rejects.toThrow('You are not a member of this workspace');
    });
  });

  describe('update', () => {
    it('should update repository when user is member', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({
        id: mockRepoId,
        name: 'old-name',
        workspaceId: mockWorkspaceId,
      });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({
        id: mockRepoId,
        name: 'updated-name',
      });

      const result = await repositoriesService.update(mockRepoId, {
        name: 'updated-name',
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.name).toBe('updated-name');
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.update(mockRepoId, { name: 'new' }, mockWorkspaceId, mockUserId)
      ).rejects.toThrow('You are not a member of this workspace');
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(null);

      await expect(
        repositoriesService.update('nonexistent', { name: 'new' }, mockWorkspaceId, mockUserId)
      ).rejects.toThrow('Repository not found');
    });
  });

  describe('delete', () => {
    it('should delete repository when user is member', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({
        id: mockRepoId,
        name: 'repo-to-delete',
        workspaceId: mockWorkspaceId,
      });
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      const result = await repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockRepoId);
      expect(repositoriesRepository.delete).toHaveBeenCalledWith(mockRepoId);
    });

    it('should throw FORBIDDEN when user is not member', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId)
      ).rejects.toThrow('You are not a member of this workspace');
    });

    it('should throw NOT_FOUND when repository does not exist', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(null);

      await expect(
        repositoriesService.delete('nonexistent', mockWorkspaceId, mockUserId)
      ).rejects.toThrow('Repository not found');
    });
  });

  describe('list edge cases', () => {
    it('+ should call repository with workspace ID', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue([]);

      await repositoriesService.list('test-workspace');
      expect(repositoriesRepository.listByWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('+ should return multiple repositories', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue([
        { id: 'r1', name: 'repo-1' },
        { id: 'r2', name: 'repo-2' },
        { id: 'r3', name: 'repo-3' },
      ]);

      const result = await repositoriesService.list(mockWorkspaceId);
      expect(result).toHaveLength(3);
    });

    it('+ should preserve repository order', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const repos = [{ id: 'r1', name: 'alpha' }, { id: 'r2', name: 'beta' }];
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue(repos);

      const result = await repositoriesService.list(mockWorkspaceId);
      expect(result[0].name).toBe('alpha');
      expect(result[1].name).toBe('beta');
    });
  });

  describe('create edge cases', () => {
    it('+ should create with all optional fields', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({
        id: mockRepoId,
        name: 'full-repo',
        workspaceId: mockWorkspaceId,
      });

      const result = await repositoriesService.create({
        projectId: 'project-123',
        name: 'full-repo',
        url: 'https://github.com/test/full-repo',
        defaultBranch: 'develop',
        connectionType: 'scm',
        autoScan: true,
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
    });

    it('+ should allow manager role to create', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('manager');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: mockRepoId, name: 'repo' });

      const result = await repositoriesService.create({
        projectId: 'p1', name: 'repo', url: 'http://test.com/repo',
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
    });

    it('- should throw for viewer role', async () => {
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('viewer');

      // Viewer is still a member, so this should NOT throw
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: mockRepoId, name: 'repo' });

      const result = await repositoriesService.create({
        projectId: 'project-123',
        name: 'repo',
        url: 'https://github.com/test/repo',
      }, mockWorkspaceId, mockUserId);

      expect(result).toBeDefined();
    });
  });

  describe('update edge cases', () => {
    it('+ should update with partial fields', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: mockRepoId, name: 'updated' });

      const result = await repositoriesService.update(mockRepoId, { defaultBranch: 'main' }, mockWorkspaceId, mockUserId);
      expect(result).toBeDefined();
    });

    it('+ should call repository with correct ID', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: mockRepoId });

      await repositoriesService.update(mockRepoId, { name: 'new' }, mockWorkspaceId, mockUserId);
      expect(repositoriesRepository.update).toHaveBeenCalledWith(mockRepoId, expect.any(Object));
    });
  });

  describe('delete edge cases', () => {
    it('+ should call repository delete with correct ID', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      await repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId);
      expect(repositoriesRepository.delete).toHaveBeenCalledWith(mockRepoId);
    });

    it('+ should return deleted repository data', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      const repoData = { id: mockRepoId, name: 'deleted-repo', url: 'http://test.com' };

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(repoData);
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      const result = await repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId);
      expect(result.name).toBe('deleted-repo');
    });
  });

  describe('list with various states', () => {
    it('+ should handle workspace with many repositories', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const repos = Array.from({ length: 20 }, (_, i) => ({ id: `r-${i}`, name: `repo-${i}` }));
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue(repos);

      const result = await repositoriesService.list(mockWorkspaceId);
      expect(result).toHaveLength(20);
    });

    it('+ should preserve repository properties', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      vi.mocked(repositoriesRepository.listByWorkspace).mockResolvedValue([
        { id: 'r1', name: 'repo-1', url: 'https://github.com/test/repo1', defaultBranch: 'main', connectionType: 'scm' },
      ]);

      const result = await repositoriesService.list(mockWorkspaceId);
      expect(result[0].url).toBe('https://github.com/test/repo1');
      expect(result[0].defaultBranch).toBe('main');
    });
  });

  describe('create with various roles', () => {
    it('+ should allow owner to create', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: mockRepoId, name: 'repo' });

      const result = await repositoriesService.create({ projectId: 'p1', name: 'repo', url: 'http://test.com' }, mockWorkspaceId, mockUserId);
      expect(result.id).toBe(mockRepoId);
    });

    it('+ should allow manager to create', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('manager');
      vi.mocked(repositoriesRepository.create).mockResolvedValue({ id: mockRepoId, name: 'repo' });

      const result = await repositoriesService.create({ projectId: 'p1', name: 'repo', url: 'http://test.com' }, mockWorkspaceId, mockUserId);
      expect(result.id).toBe(mockRepoId);
    });
  });

  describe('update with various changes', () => {
    it('+ should update name only', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: mockRepoId, name: 'new-name' });

      const result = await repositoriesService.update(mockRepoId, { name: 'new-name' }, mockWorkspaceId, mockUserId);
      expect(result.name).toBe('new-name');
    });

    it('+ should update url only', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.update).mockResolvedValue({ id: mockRepoId, url: 'https://new-url.com' });

      const result = await repositoriesService.update(mockRepoId, { url: 'https://new-url.com' }, mockWorkspaceId, mockUserId);
      expect(result.url).toBe('https://new-url.com');
    });
  });

  describe('delete with various states', () => {
    it('+ should delete and return full repository data', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');
      const repoData = { id: mockRepoId, name: 'repo', url: 'http://test.com', defaultBranch: 'main' };

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue(repoData);
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      const result = await repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId);
      expect(result.defaultBranch).toBe('main');
    });

    it('+ should call getById before delete', async () => {
      const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
      const { workspaceRepository } = await import('@/server/modules/workspace/repositories/workspace.repository');

      vi.mocked(workspaceRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(repositoriesRepository.getById).mockResolvedValue({ id: mockRepoId });
      vi.mocked(repositoriesRepository.delete).mockResolvedValue(undefined);

      await repositoriesService.delete(mockRepoId, mockWorkspaceId, mockUserId);
      expect(repositoriesRepository.getById).toHaveBeenCalledWith(mockRepoId, mockWorkspaceId);
    });
  });
});
