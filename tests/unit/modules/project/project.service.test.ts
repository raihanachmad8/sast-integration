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

const mockProjectRepo = {
  listByWorkspace: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  listMemberIds: vi.fn(),
  listTeamIds: vi.fn(),
  listMemberNames: vi.fn(),
  listTeamNames: vi.fn(),
  listRepositoryIds: vi.fn(),
  listRepositoryNames: vi.fn(),
  listMemberIdsByProjectIds: vi.fn(),
  listTeamIdsByProjectIds: vi.fn(),
  listMemberNamesByProjectIds: vi.fn(),
  listTeamNamesByProjectIds: vi.fn(),
  listRepositoryIdsByProjectIds: vi.fn(),
  listRepositoryNamesByProjectIds: vi.fn(),
  listRepositories: vi.fn(),
  listRepositoriesByWorkspace: vi.fn(),
  attachRepository: vi.fn(),
  setMembers: vi.fn(),
  setTeams: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
};

const mockApiTokenRepo = {
  create: vi.fn(),
  listByProject: vi.fn(),
  revoke: vi.fn(),
  findById: vi.fn(),
};

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: mockProjectRepo,
}));

vi.mock('@/server/modules/project/repositories/project-api-token.repository', () => ({
  projectApiTokenRepository: mockApiTokenRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/server/db/client', () => ({
  db: {
    transaction: vi.fn(async (fn: Function) => fn({})),
  },
}));

const { projectService } = await import('@/server/modules/project/services/project.service');

describe('projectService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that projects include member, team, and repository summaries
   */
  it('should return projects with member and team summaries', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.listByWorkspace.mockResolvedValue([
      { id: 'proj-1', name: 'SAST Core', workspaceId: 'ws-1' },
    ]);
    mockProjectRepo.listMemberIdsByProjectIds.mockResolvedValue(new Map([['proj-1', ['user-1']]]));
    mockProjectRepo.listTeamIdsByProjectIds.mockResolvedValue(new Map([['proj-1', ['team-1']]]));
    mockProjectRepo.listMemberNamesByProjectIds.mockResolvedValue(new Map([['proj-1', ['Alice']]]));
    mockProjectRepo.listTeamNamesByProjectIds.mockResolvedValue(new Map([['proj-1', ['Security']]]));
    mockProjectRepo.listRepositoryIdsByProjectIds.mockResolvedValue(new Map([['proj-1', ['repo-1']]]));
    mockProjectRepo.listRepositoryNamesByProjectIds.mockResolvedValue(new Map([['proj-1', ['frontend']]]));

    const result = await projectService.list('ws-1', 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0].members).toEqual(['user-1']);
    expect(result[0].teams).toEqual(['team-1']);
    expect(result[0].repositories).toEqual(['frontend']);
  });

  /**
   * Purpose: Validates that an empty array is returned when no projects exist
   */
  it('should return empty array when workspace has no projects', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.listByWorkspace.mockResolvedValue([]);

    const result = await projectService.list('ws-1', 'user-1');

    expect(result).toEqual([]);
    expect(mockProjectRepo.listMemberIdsByProjectIds).not.toHaveBeenCalled();
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
  it('should return project with members and teams', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', name: 'SAST Core' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.listMemberIds.mockResolvedValue(['user-1']);
    mockProjectRepo.listTeamIds.mockResolvedValue(['team-1']);
    mockProjectRepo.listMemberNames.mockResolvedValue(['Alice']);
    mockProjectRepo.listTeamNames.mockResolvedValue(['Security']);
    mockProjectRepo.listRepositoryNames.mockResolvedValue(['frontend-repo']);

    const result = await projectService.getById('proj-1', 'user-1');

    expect(result.id).toBe('proj-1');
    expect(result.members).toEqual(['user-1']);
    expect(result.teams).toEqual(['team-1']);
    expect(result.repositories).toEqual(['frontend-repo']);
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for a nonexistent project
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.getById('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that non-members cannot access project details
   */
  it('should throw NOT_MEMBER when user is not in the workspace', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.getById('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that workspace-less projects can be accessed without membership check
   */
  it('should allow access when project has no workspaceId', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: null });
    mockProjectRepo.listMemberIds.mockResolvedValue([]);
    mockProjectRepo.listTeamIds.mockResolvedValue([]);
    mockProjectRepo.listMemberNames.mockResolvedValue([]);
    mockProjectRepo.listTeamNames.mockResolvedValue([]);
    mockProjectRepo.listRepositoryNames.mockResolvedValue([]);

    const result = await projectService.getById('proj-1', 'user-1');

    expect(result.id).toBe('proj-1');
    expect(mockWorkspaceRepo.getMemberRole).not.toHaveBeenCalled();
  });
});

describe('projectService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a slug is auto-generated from the project name
   */
  it('should create a project with generated slug when slug not provided', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'proj-1', name: 'New Project', slug: 'new-project' });

    const result = await projectService.create({ name: 'New Project' }, 'ws-1', 'user-1');

    expect(result.name).toBe('New Project');
    expect(mockProjectRepo.create).toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that SLUG_CONFLICT is thrown for duplicate slugs
   */
  it('should throw SLUG_CONFLICT when slug already exists in workspace', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue({ id: 'existing-proj' });

    await expect(
      projectService.create({ name: 'Project', slug: 'existing-slug' }, 'ws-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that projects can be created with initial member assignments
   */
  it('should create project with members when memberIds provided', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'proj-1', name: 'Project' });
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.create({ name: 'Project', memberIds: ['user-1', 'user-2'] }, 'ws-1', 'user-1');

    expect(mockProjectRepo.setMembers).toHaveBeenCalledWith('proj-1', ['user-1', 'user-2'], expect.anything());
  });

  /**
   * Purpose: Validates that projects can be created with initial team assignments
   */
  it('should create project with teams when teamIds provided', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'proj-1', name: 'Project' });
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.create({ name: 'Project', teamIds: ['team-1'] }, 'ws-1', 'user-1');

    expect(mockProjectRepo.setTeams).toHaveBeenCalledWith('proj-1', ['team-1'], expect.anything());
  });

  /**
   * Purpose: Validates that setMembers and setTeams are not called when no IDs are provided
   */
  it('should not call setMembers/setTeams when arrays are empty', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(null);
    mockProjectRepo.create.mockResolvedValue({ id: 'proj-1', name: 'Project' });

    await projectService.create({ name: 'Project' }, 'ws-1', 'user-1');

    expect(mockProjectRepo.setMembers).not.toHaveBeenCalled();
    expect(mockProjectRepo.setTeams).not.toHaveBeenCalled();
  });
});

describe('projectService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that project metadata can be updated by a member
   */
  it('should update project metadata successfully', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', slug: 'old-slug' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.update.mockResolvedValue({ id: 'proj-1', name: 'Updated Project' });

    const result = await projectService.update('proj-1', { name: 'Updated Project' }, 'user-1');

    expect(result.name).toBe('Updated Project');
  });

  /**
   * Purpose: Validates that updating a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.update('proj-1', { name: 'Updated' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that non-members cannot update project settings
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.update('proj-1', { name: 'Updated' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that updating to an existing slug throws SLUG_CONFLICT
   */
  it('should throw SLUG_CONFLICT when updating to an existing slug', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', slug: 'old-slug' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.findBySlug.mockResolvedValue({ id: 'other-proj' });

    await expect(
      projectService.update('proj-1', { slug: 'taken-slug' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that keeping the same slug does not trigger a conflict check
   */
  it('should not throw SLUG_CONFLICT when slug remains unchanged', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', slug: 'same-slug' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.update.mockResolvedValue({ id: 'proj-1' });

    await projectService.update('proj-1', { slug: 'same-slug' }, 'user-1');

    expect(mockProjectRepo.findBySlug).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that project members can be updated via the update operation
   */
  it('should update project members when memberIds provided', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', slug: 'proj' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.update.mockResolvedValue({ id: 'proj-1' });
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.update('proj-1', { memberIds: ['user-1'] }, 'user-1');

    expect(mockProjectRepo.setMembers).toHaveBeenCalledWith('proj-1', ['user-1'], expect.anything());
  });

  /**
   * Purpose: Validates that project teams can be updated via the update operation
   */
  it('should update project teams when teamIds provided', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1', slug: 'proj' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.update.mockResolvedValue({ id: 'proj-1' });
    mockProjectRepo.setMembers.mockResolvedValue(undefined);
    mockProjectRepo.setTeams.mockResolvedValue(undefined);

    await projectService.update('proj-1', { teamIds: ['team-1'] }, 'user-1');

    expect(mockProjectRepo.setTeams).toHaveBeenCalledWith('proj-1', ['team-1'], expect.anything());
  });
});

describe('projectService.softDelete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a project can be soft deleted by a member
   */
  it('should soft delete a project successfully', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.softDelete.mockResolvedValue({ id: 'proj-1', deletedAt: new Date() });

    const result = await projectService.softDelete('proj-1', 'user-1');

    expect(mockProjectRepo.softDelete).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  /**
   * Purpose: Validates that soft deleting a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.softDelete('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that non-members cannot soft delete projects
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      projectService.softDelete('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_MEMBER);
  });
});

describe('projectService.listRepositories', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that repositories attached to a project are returned
   */
  it('should return repositories for a project', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockProjectRepo.listRepositories.mockResolvedValue([{ id: 'repo-1', name: 'frontend' }]);

    const result = await projectService.listRepositories('proj-1', 'user-1');

    expect(result).toHaveLength(1);
  });

  /**
   * Purpose: Validates that listing repositories for a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.listRepositories('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

describe('projectService.attachRepository', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a repository can be attached to a project
   */
  it('should attach a repository to a project', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
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

  /**
   * Purpose: Validates that an API token is created and the raw token is returned
   */
  it('should create an API token and return raw token once', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockApiTokenRepo.create.mockResolvedValue({
      token: { id: 'tok-1', name: 'CI Token', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'] },
      rawToken: 'sast_p_abc123secret',
    });

    const result = await projectService.createApiToken('proj-1', 'user-1', { name: 'CI Token' });

    expect(result.rawToken).toBe('sast_p_abc123secret');
    expect(result.token.name).toBe('CI Token');
  });

  /**
   * Purpose: Validates that creating an API token for a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.createApiToken('proj-1', 'user-1', { name: 'Token' })
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

describe('projectService.listApiTokens', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all API tokens for a project are returned
   */
  it('should list API tokens for a project', async () => {
    mockProjectRepo.findById.mockResolvedValue({ id: 'proj-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockApiTokenRepo.listByProject.mockResolvedValue([
      { id: 'tok-1', name: 'CI Token', tokenPrefix: 'sast_p_abc...' },
    ]);

    const result = await projectService.listApiTokens('proj-1', 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('CI Token');
  });

  /**
   * Purpose: Validates that listing tokens for a nonexistent project throws NOT_FOUND
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.listApiTokens('proj-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

describe('projectService.revokeApiToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an API token can be revoked
   */
  it('should revoke an API token', async () => {
    mockApiTokenRepo.findById.mockResolvedValue({ id: 'tok-1', projectId: 'proj-1' });
    mockApiTokenRepo.revoke.mockResolvedValue({ id: 'tok-1', revokedAt: new Date() });

    const result = await projectService.revokeApiToken('proj-1', 'tok-1', 'user-1');

    expect(mockApiTokenRepo.revoke).toHaveBeenCalledWith('tok-1', 'user-1');
  });

  /**
   * Purpose: Validates that revoking a nonexistent token throws TOKEN_NOT_FOUND
   */
  it('should throw TOKEN_NOT_FOUND when token does not exist', async () => {
    mockApiTokenRepo.findById.mockResolvedValue(null);

    await expect(
      projectService.revokeApiToken('proj-1', 'tok-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });

  /**
   * Purpose: Validates that tokens cannot be revoked from a different project
   */
  it('should throw TOKEN_NOT_FOUND when token belongs to different project', async () => {
    mockApiTokenRepo.findById.mockResolvedValue({ id: 'tok-1', projectId: 'other-proj' });

    await expect(
      projectService.revokeApiToken('proj-1', 'tok-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });
});

describe('projectService.generateSlug', () => {
  /**
   * Purpose: Validates that project names are converted to lowercase slug format with hyphens
   */
  it('should generate a lowercase slug with hyphens', () => {
    const slug = projectService.generateSlug('SAST Core');
    expect(slug).toBe('sast-core');
  });

  /**
   * Purpose: Validates that special characters are stripped during slug generation
   */
  it('should remove special characters', () => {
    const slug = projectService.generateSlug('My Project (v2)!');
    expect(slug).toBe('my-project-v2');
  });

  /**
   * Purpose: Validates that multiple spaces collapse to single hyphens in slugs
   */
  it('should collapse multiple hyphens', () => {
    const slug = projectService.generateSlug('A   B   C');
    expect(slug).toBe('a-b-c');
  });

  /**
   * Purpose: Validates that slugs are truncated to the maximum allowed length
   */
  it('should truncate to max slug length', () => {
    const longName = 'a'.repeat(300);
    const slug = projectService.generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(255);
  });
});
