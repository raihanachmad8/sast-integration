/**
 * Unit tests for audited project service behavior.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@/commons/constants/permissions';

const mockProjectRepo = {
  listByWorkspaceWithAssociations: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  setTeams: vi.fn(),
  setMembers: vi.fn(),
  setRepositories: vi.fn(),
  findTeamIdsInWorkspace: vi.fn(),
  findRepositoryIdsInWorkspace: vi.fn(),
};

const mockTokenRepo = {
  create: vi.fn(),
  listByProject: vi.fn(),
  revoke: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
  findMemberUserIds: vi.fn(),
};

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: mockProjectRepo,
}));

vi.mock('@/server/modules/project/repositories/project-api-token.repository', () => ({
  projectApiTokenRepository: mockTokenRepo,
}));

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

const { projectService } = await import('@/server/modules/project/services/project.service');

describe('projectService audited behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify project listing uses the repository batch association loader.
   */
  it('should list projects without per-project association queries', async () => {
    const rows = [{ id: 'project-1', teams: ['Security'], members: ['Ada'], repositories: ['api'] }];
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockProjectRepo.listByWorkspaceWithAssociations.mockResolvedValue(rows);

    const result = await projectService.list('workspace-1', 'user-1');

    expect(result).toEqual(rows);
    expect(mockProjectRepo.listByWorkspaceWithAssociations).toHaveBeenCalledWith('workspace-1');
  });

  /**
   * Purpose: Verify create persists all multi-select project associations.
   */
  it('should validate and persist selected teams, members, and repositories on create', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(ROLE.MANAGER);
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'project-1' });
    mockProjectRepo.findTeamIdsInWorkspace.mockResolvedValue(['team-1']);
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1']);
    mockProjectRepo.findRepositoryIdsInWorkspace.mockResolvedValue(['repo-1']);

    await projectService.create(
      {
        name: 'Backend API',
        teamIds: ['team-1', 'team-1'],
        memberIds: ['user-1'],
        repositoryIds: ['repo-1'],
      },
      'workspace-1',
      'manager-1',
    );

    expect(mockProjectRepo.setTeams).toHaveBeenCalledWith('project-1', ['team-1']);
    expect(mockProjectRepo.setMembers).toHaveBeenCalledWith('project-1', ['user-1']);
    expect(mockProjectRepo.setRepositories).toHaveBeenCalledWith('project-1', ['repo-1']);
  });

  /**
   * Purpose: Verify project detail access is scoped to the workspace route.
   */
  it('should reject project detail access when the project belongs to another workspace', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'project-1', workspace_id: 'other-workspace' });

    await expect(projectService.getById('workspace-1', 'project-1', 'user-1')).rejects.toThrow('Project not found');
  });

});
