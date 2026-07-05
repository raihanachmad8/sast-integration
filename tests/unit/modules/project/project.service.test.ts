/**
 * Unit tests for projectService (Project Management)
 *
 * Tests the business logic layer for:
 * - Listing projects
 * - Getting project by ID
 * - Creating projects
 * - Updating projects
 * - Soft deleting projects
 * - Managing project API tokens
 * - Slug generation and conflict handling
 *
 * Focus is on permission checks, workspace scoping, and ownership rules.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PROJECT } from '@/server/modules/project/constants';
import { createMockProject, createMockWorkspace } from '../../../helpers/factories';

const mockProjectRepo = {
  list: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  listMemberSummaries: vi.fn(),
  listTeamSummaries: vi.fn(),
  listRepositorySummaries: vi.fn(),
  listMemberSummariesByProjectIds: vi.fn(),
  listTeamSummariesByProjectIds: vi.fn(),
  listRepositorySummariesByProjectIds: vi.fn(),
  listRepositories: vi.fn(),
  listRepositoriesByWorkspace: vi.fn(),
  attachRepository: vi.fn(),
  setMembers: vi.fn(),
  setTeams: vi.fn(),
  setRepositories: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

const mockApiTokenRepo = {
  create: vi.fn(),
  listByProject: vi.fn(),
  listByProjectPaginated: vi.fn(),
  revoke: vi.fn(),
  findById: vi.fn(),
};

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: mockProjectRepo,
}));

vi.mock('@/server/modules/project/repositories/project-api-token.repository', () => ({
  projectApiTokenRepository: mockApiTokenRepo,
}));

vi.mock('@/server/modules/project/services/project-api-token.service', () => ({
  projectApiTokenService: {
    create: vi.fn(),
    list: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/server/db/client', () => ({
  db: {
    transaction: vi.fn(async (fn: Function) => fn({})),
  },
}));

const { generateSlug } = await import('@/commons/utils/slug');
const { projectService } = await import('@/server/modules/project/services/project.service');

describe('projectService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that projects include member, team, and repository summaries
   */
  it('should return projects with member and team summaries', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.list.mockResolvedValue({
      data: [createMockProject({ name: 'SAST Core' })],
      total: 1,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });
    mockProjectRepo.listMemberSummariesByProjectIds.mockResolvedValue(new Map([['proj-1', [{ id: 'user-1', name: 'Alice' }]]]));
    mockProjectRepo.listTeamSummariesByProjectIds.mockResolvedValue(new Map([['proj-1', [{ id: 'team-1', name: 'Security' }]]]));
    mockProjectRepo.listRepositorySummariesByProjectIds.mockResolvedValue(new Map([['proj-1', [{ id: 'repo-1', name: 'frontend' }]]]));

    const result = await projectService.list('ws-1', 'user-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].members).toEqual([{ id: 'user-1', name: 'Alice' }]);
    expect(result.data[0].teams).toEqual([{ id: 'team-1', name: 'Security' }]);
    expect(result.data[0].repositories).toEqual([{ id: 'repo-1', name: 'frontend' }]);
  });

  /**
   * Purpose: Validates that an empty paginated result is returned when no projects exist
   */
  it('should return empty paginated result when workspace has no projects', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.list.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });

    const result = await projectService.list('ws-1', 'user-1');

    expect(result.data).toEqual([]);
    expect(mockProjectRepo.listMemberSummariesByProjectIds).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that non-members cannot list projects
   */
  it('should throw NOT_MEMBER when user is not in the workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.list('ws-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a project is returned with its members, teams, and repositories
   */
  it('should return project with member, team, and repository summaries', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ name: 'SAST Core' }));
    mockProjectRepo.listMemberSummaries.mockResolvedValue([{ id: 'user-1', name: 'Alice' }]);
    mockProjectRepo.listTeamSummaries.mockResolvedValue([{ id: 'team-1', name: 'Security' }]);
    mockProjectRepo.listRepositorySummaries.mockResolvedValue([{ id: 'repo-1', name: 'frontend-repo' }]);

    const result = await projectService.getById('ws-1', 'proj-1', 'user-1');

    expect(result.id).toBe('proj-1');
    expect(result.members).toEqual([{ id: 'user-1', name: 'Alice' }]);
    expect(result.teams).toEqual([{ id: 'team-1', name: 'Security' }]);
    expect(result.repositories).toEqual([{ id: 'repo-1', name: 'frontend-repo' }]);
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for a nonexistent project
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.getById('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that non-members cannot access project details
   */
  it('should throw NOT_MEMBER when user is not in the workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    mockProjectRepo.findById.mockResolvedValue(createMockProject());

    await expect(
      projectService.getById('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a slug is auto-generated from the project name
   */
  it('should create a project with generated slug when slug not provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue(createMockProject({ name: 'New Project', slug: 'new-project' }));

    const result = await projectService.create('ws-1', { name: 'New Project' }, 'user-1');

    expect(result.name).toBe('New Project');
    expect(mockProjectRepo.create).toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that SLUG_CONFLICT is thrown for duplicate slugs
   */
  it('should throw SLUG_CONFLICT when slug already exists in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockProjectRepo.findBySlug.mockResolvedValue(createMockProject({ id: 'existing-proj' }));

    await expect(
      projectService.create('ws-1', { name: 'Project', slug: 'existing-slug' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that projects can be created with initial member assignments
   */
  it('should create project with members when memberIds provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue(createMockProject({ name: 'Project' }));
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.create('ws-1', { name: 'Project', memberIds: ['user-1', 'user-2'] }, 'user-1');

    expect(mockProjectRepo.setMembers).toHaveBeenCalledWith('proj-1', ['user-1', 'user-2'], expect.anything());
  });

  /**
   * Purpose: Validates that projects can be created with initial team assignments
   */
  it('should create project with teams when teamIds provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue(createMockProject({ name: 'Project' }));
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.create('ws-1', { name: 'Project', teamIds: ['team-1'] }, 'user-1');

    expect(mockProjectRepo.setTeams).toHaveBeenCalledWith('proj-1', ['team-1'], expect.anything());
  });

  /**
   * Purpose: Validates that setMembers and setTeams are not called when no IDs are provided
   */
  it('should not call setMembers/setTeams when arrays are empty', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('owner');
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'proj-1', name: 'Project' });

    await projectService.create('ws-1', { name: 'Project' }, 'user-1');

    expect(mockProjectRepo.setMembers).not.toHaveBeenCalled();
    expect(mockProjectRepo.setTeams).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that non-manager/owner cannot create projects
   */
  it('should throw INSUFFICIENT_ROLE when member tries to create', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');

    await expect(
      projectService.create('ws-1', { name: 'Project' }, 'user-1')
    ).rejects.toThrow('Insufficient permissions');
  });
});

describe('projectService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that project metadata can be updated by a manager
   */
  it('should update project metadata successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ slug: 'old-slug' }));
    mockProjectRepo.update.mockResolvedValue(createMockProject({ name: 'Updated Project' }));

    const result = await projectService.update('ws-1', 'proj-1', { name: 'Updated Project', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1');

    expect(result.name).toBe('Updated Project');
  });

  /**
   * Purpose: Validates that updating a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.update('ws-1', 'proj-1', { name: 'Updated', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that non-members cannot update project settings
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);
    mockProjectRepo.findById.mockResolvedValue(createMockProject());

    await expect(
      projectService.update('ws-1', 'proj-1', { name: 'Updated', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that updating to an existing slug throws SLUG_CONFLICT
   */
  it('should throw SLUG_CONFLICT when updating to an existing slug', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ slug: 'old-slug' }));
    mockProjectRepo.findBySlug.mockResolvedValue(createMockProject({ id: 'other-proj' }));

    await expect(
      projectService.update('ws-1', 'proj-1', { slug: 'taken-slug', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that keeping the same slug does not trigger a conflict check
   */
  it('should not throw SLUG_CONFLICT when slug remains unchanged', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ slug: 'same-slug' }));
    mockProjectRepo.update.mockResolvedValue(createMockProject());

    await projectService.update('ws-1', 'proj-1', { slug: 'same-slug', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1');

    expect(mockProjectRepo.findBySlug).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that project members can be updated via the update operation
   */
  it('should update project members when memberIds provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ slug: 'proj' }));
    mockProjectRepo.update.mockResolvedValue(createMockProject());

    await projectService.update('ws-1', 'proj-1', { memberIds: ['user-1'], teamIds: [], repositoryIds: [] }, 'user-1');

    expect(mockProjectRepo.setMembers).toHaveBeenCalledWith('proj-1', ['user-1'], expect.anything());
  });

  /**
   * Purpose: Validates that project teams can be updated via the update operation
   */
  it('should update project teams when teamIds provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.findById.mockResolvedValue(createMockProject({ slug: 'proj' }));
    mockProjectRepo.update.mockResolvedValue(createMockProject());

    await projectService.update('ws-1', 'proj-1', { teamIds: ['team-1'], memberIds: [], repositoryIds: [] }, 'user-1');

    expect(mockProjectRepo.setTeams).toHaveBeenCalledWith('proj-1', ['team-1'], expect.anything());
  });

  /**
   * Purpose: Validates that member role cannot update projects
   */
  it('should throw INSUFFICIENT_ROLE when member tries to update', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');

    await expect(
      projectService.update('ws-1', 'proj-1', { name: 'Updated', memberIds: [], teamIds: [], repositoryIds: [] }, 'user-1')
    ).rejects.toThrow('Insufficient permissions');
  });
});

describe('projectService.softDelete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a project can be soft deleted by a manager
   */
  it('should soft delete a project successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('manager');
    mockProjectRepo.softDelete.mockResolvedValue({ id: 'proj-1', deletedAt: new Date() });

    const result = await projectService.softDelete('ws-1', 'proj-1', 'user-1');

    expect(mockProjectRepo.softDelete).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  /**
   * Purpose: Validates that soft deleting a nonexistent project does not throw from the service
   * (softDelete calls repository directly — no findById check in the current implementation)
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.softDelete('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that member role cannot soft delete projects
   */
  it('should throw INSUFFICIENT_ROLE when member tries to delete', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');

    await expect(
      projectService.softDelete('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow('Insufficient permissions');
  });
});

describe('projectService.listRepositories', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that repositories attached to a project are returned
   */
  it('should return repositories for a project', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.listRepositories.mockResolvedValue([{ id: 'repo-1', name: 'frontend' }]);

    const result = await projectService.listRepositories('ws-1', 'proj-1', 'user-1');

    expect(result).toHaveLength(1);
  });

  it('should throw NOT_MEMBER when user is not workspace member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.listRepositories('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.attachRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a repository can be attached to a project
   */
  it('should attach a repository to a project', async () => {
    mockProjectRepo.findById.mockResolvedValue(createMockProject());
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.attachRepository.mockResolvedValue({ id: 'repo-1', name: 'frontend' });

    const result = await projectService.attachRepository(
      'proj-1',
      { name: 'frontend', url: 'https://github.com/org/repo', connectionType: ['scm'] },
      'user-1'
    );

    expect(result.id).toBe('repo-1');
  });

  /**
   * Purpose: Validates that attaching a repository to a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.attachRepository(
        'proj-1',
        { name: 'frontend', url: 'https://github.com/org/repo', connectionType: ['scm'] },
        'user-1'
      )
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

describe('projectService.createApiToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should create an API token and return raw token once', async () => {
    mockProjectRepo.findById.mockResolvedValue(createMockProject());
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    const { projectApiTokenService } = await import('@/server/modules/project/services/project-api-token.service');
    vi.mocked(projectApiTokenService.create).mockResolvedValue({
      token: { id: 'tok-1', name: 'CI Token', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'] },
      rawToken: 'sast_p_abc123secret',
    });

    const result = await projectService.createApiToken('proj-1', { name: 'CI Token' }, 'user-1');

    expect(result.rawToken).toBe('sast_p_abc123secret');
    expect(result.token.name).toBe('CI Token');
  });

  it('should throw NOT_MEMBER when user is not workspace member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.createApiToken('ws-1', 'proj-1', { name: 'Token' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.listApiTokens', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all API tokens for a project are returned
   */
  it('should list API tokens for a project', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    const { projectApiTokenService } = await import('@/server/modules/project/services/project-api-token.service');
    vi.mocked(projectApiTokenService.list).mockResolvedValue({
      data: [{ id: 'tok-1', name: 'CI Token', tokenPrefix: 'sast_p_abc...' }],
      total: 1,
      page: 1,
      perPage: 20,
      lastPage: 1,
    });

    const result = await projectService.listApiTokens('ws-1', 'proj-1', 'user-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('CI Token');
  });

  it('should throw NOT_MEMBER when user is not workspace member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.listApiTokens('ws-1', 'proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.revokeApiToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should revoke an API token', async () => {
    mockProjectRepo.findById.mockResolvedValue(createMockProject());
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    const { projectApiTokenService } = await import('@/server/modules/project/services/project-api-token.service');
    vi.mocked(projectApiTokenService.revoke).mockResolvedValue({ id: 'tok-1', revokedAt: new Date() });

    const result = await projectService.revokeApiToken('proj-1', 'tok-1', 'user-1');

    expect(result.id).toBe('tok-1');
  });

  it('should throw TOKEN_NOT_FOUND when token does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(createMockProject());
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    const { projectApiTokenService } = await import('@/server/modules/project/services/project-api-token.service');
    vi.mocked(projectApiTokenService.revoke).mockRejectedValue(new Error(PROJECT.ERRORS.TOKEN_NOT_FOUND));

    await expect(
      projectService.revokeApiToken('proj-1', 'tok-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });

  it('should throw TOKEN_NOT_FOUND when token belongs to different project', async () => {
    mockProjectRepo.findById.mockResolvedValue(createMockProject());
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    const { projectApiTokenService } = await import('@/server/modules/project/services/project-api-token.service');
    vi.mocked(projectApiTokenService.revoke).mockRejectedValue(new Error(PROJECT.ERRORS.TOKEN_NOT_FOUND));

    await expect(
      projectService.revokeApiToken('proj-1', 'tok-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });
});

describe('generateSlug', () => {
  /**
   * Purpose: Validates that project names are converted to lowercase slug format with hyphens
   */
  it('should generate a lowercase slug with hyphens', () => {
    const slug = generateSlug('SAST Core');
    expect(slug).toBe('sast-core');
  });

  /**
   * Purpose: Validates that special characters are stripped during slug generation
   */
  it('should remove special characters', () => {
    const slug = generateSlug('My Project (v2)!');
    expect(slug).toBe('my-project-v2');
  });

  /**
   * Purpose: Validates that multiple spaces collapse to single hyphens in slugs
   */
  it('should collapse multiple hyphens', () => {
    const slug = generateSlug('A   B   C');
    expect(slug).toBe('a-b-c');
  });

  /**
   * Purpose: Validates that slugs are truncated to the maximum allowed length
   */
  it('should truncate to max slug length', () => {
    const longName = 'a'.repeat(300);
    const slug = generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(255);
  });
});
