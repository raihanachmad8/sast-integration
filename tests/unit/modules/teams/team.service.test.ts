/**
 * Unit tests for teamService (Team Management)
 *
 * Tests the business logic layer for:
 * - Listing teams
 * - Getting team by ID
 * - Creating teams
 * - Updating teams
 * - Soft deleting teams
 * - Managing team members
 *
 * Focus is on permission checks, workspace scoping, and slug conflict handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEAM } from '@/server/modules/teams/constants';

const mockTeamRepo = {
  listByWorkspaceWithSummaries: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  listMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  setMembers: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
  findMemberUserIds: vi.fn(),
};

const mockDb = {
  transaction: vi.fn((fn: Function) => fn(mockDb)),
};

vi.mock('@/server/modules/teams/repositories/team.repository', () => ({
  teamRepository: mockTeamRepo,
}));

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

vi.mock('@/server/db/client', () => ({
  db: mockDb,
}));

const { teamService } = await import('@/server/modules/teams/services/team.service');

describe('teamService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that teams are returned when the user is a workspace member
   */
  it('should return teams when user is a workspace member', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.listByWorkspaceWithSummaries.mockResolvedValue([
      { id: 'team-1', name: 'Security' },
    ]);

    const result = await teamService.list('ws-1', 'user-1');

    expect(result).toHaveLength(1);
    expect(mockTeamRepo.listByWorkspaceWithSummaries).toHaveBeenCalledWith('ws-1');
  });

  /**
   * Purpose: Validates that non-members cannot list teams
   */
  it('should throw NOT_MEMBER when user is not in the workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.list('ws-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });
});

describe('teamService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a team is returned when the user is a member and the team belongs to the workspace
   */
  it('should return team when user is a member and team exists in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', name: 'Security' });

    const result = await teamService.getById('ws-1', 'team-1', 'user-1');

    expect(result.id).toBe('team-1');
  });

  /**
   * Purpose: Validates that non-members cannot get team details
   */
  it('should throw NOT_MEMBER when user is not in the workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.getById('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown when the team does not exist in the workspace
   */
  it('should throw NOT_FOUND when team does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(
      teamService.getById('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that a team belonging to a different workspace cannot be accessed
   */
  it('should throw NOT_FOUND when team belongs to a different workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-other' });

    await expect(
      teamService.getById('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });
});

describe('teamService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a team is created with a generated slug when not provided
   */
  it('should create a team with generated slug when slug not provided', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue(null);
    mockTeamRepo.create.mockResolvedValue({ id: 'team-1', name: 'Security Team', slug: 'security-team' });

    const result = await teamService.create('ws-1', { name: 'Security Team' }, 'user-1');

    expect(result.name).toBe('Security Team');
    expect(mockTeamRepo.create).toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that SLUG_CONFLICT is thrown when the slug already exists in the workspace
   */
  it('should throw SLUG_CONFLICT when slug already exists in workspace', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue({ id: 'existing-team' });

    await expect(
      teamService.create('ws-1', { name: 'Security', slug: 'security' }, 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that a team can be created with initial member assignments
   */
  it('should create team with members when memberIds provided', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue(null);
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1', 'user-2']);
    mockTeamRepo.create.mockResolvedValue({ id: 'team-1', name: 'Team' });
    mockTeamRepo.setMembers.mockResolvedValue([]);

    await teamService.create('ws-1', { name: 'Team', memberIds: ['user-1', 'user-2'] }, 'user-1');

    expect(mockTeamRepo.setMembers).toHaveBeenCalledWith('team-1', ['user-1', 'user-2'], expect.anything());
  });

  /**
   * Purpose: Validates that team creation fails when member IDs include non-workspace users
   */
  it('should throw when memberIds contain users not in workspace', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue(null);
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1']);
    mockTeamRepo.create.mockResolvedValue({ id: 'team-1', name: 'Team' });

    await expect(
      teamService.create('ws-1', { name: 'Team', memberIds: ['user-1', 'user-not-in-ws'] }, 'user-1')
    ).rejects.toThrow('Team members must belong to this workspace');
  });
});

describe('teamService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that team metadata can be updated successfully by a member
   */
  it('should update team metadata successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', slug: 'old-slug' });
    mockTeamRepo.update.mockResolvedValue({ id: 'team-1', name: 'Updated Team' });

    const result = await teamService.update('ws-1', 'team-1', { name: 'Updated Team' }, 'user-1');

    expect(result.name).toBe('Updated Team');
  });

  /**
   * Purpose: Validates that non-members cannot update team details
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.update('ws-1', 'team-1', { name: 'Updated' }, 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that updating a nonexistent team throws NOT_FOUND
   */
  it('should throw NOT_FOUND when team does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(
      teamService.update('ws-1', 'team-1', { name: 'Updated' }, 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Validates that SLUG_CONFLICT is thrown when updating to an existing slug
   */
  it('should throw SLUG_CONFLICT when updating to an existing slug', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', slug: 'old-slug' });
    mockTeamRepo.findBySlug.mockResolvedValue({ id: 'other-team' });

    await expect(
      teamService.update('ws-1', 'team-1', { slug: 'new-slug' }, 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that keeping the same slug does not trigger a conflict check
   */
  it('should not throw SLUG_CONFLICT when slug remains unchanged', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', slug: 'same-slug' });
    mockTeamRepo.update.mockResolvedValue({ id: 'team-1' });

    await teamService.update('ws-1', 'team-1', { slug: 'same-slug' }, 'user-1');

    expect(mockTeamRepo.findBySlug).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that team members can be updated via the update operation
   */
  it('should update team members when memberIds provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', slug: 'team' });
    mockTeamRepo.update.mockResolvedValue({ id: 'team-1' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1']);
    mockTeamRepo.setMembers.mockResolvedValue([]);

    await teamService.update('ws-1', 'team-1', { memberIds: ['user-1'] }, 'user-1');

    expect(mockTeamRepo.setMembers).toHaveBeenCalledWith('team-1', ['user-1']);
  });
});

describe('teamService.softDelete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a team can be soft deleted successfully
   */
  it('should soft delete a team successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockTeamRepo.softDelete.mockResolvedValue({ id: 'team-1', deletedAt: new Date() });

    const result = await teamService.softDelete('ws-1', 'team-1', 'user-1');

    expect(mockTeamRepo.softDelete).toHaveBeenCalledWith('team-1', 'user-1');
  });

  /**
   * Purpose: Validates that non-members cannot delete teams
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.softDelete('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that soft deleting a nonexistent team throws NOT_FOUND
   */
  it('should throw NOT_FOUND when team does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(
      teamService.softDelete('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });
});

describe('teamService.listMembers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that team members are returned when the user has access
   */
  it('should return team members when user has access', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockTeamRepo.listMembers.mockResolvedValue([
      { userId: 'user-1', name: 'Alice', email: 'alice@test.com' },
    ]);

    const result = await teamService.listMembers('ws-1', 'team-1', 'user-1');

    expect(result).toHaveLength(1);
  });

  /**
   * Purpose: Validates that non-members cannot list team members
   */
  it('should throw NOT_MEMBER when user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.listMembers('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that listing members of a nonexistent team throws NOT_FOUND
   */
  it('should throw NOT_FOUND when team does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(
      teamService.listMembers('ws-1', 'team-1', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });
});

describe('teamService.addMember', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a workspace member can be added to a team
   */
  it('should add a member to a team successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-2']);
    mockTeamRepo.addMember.mockResolvedValue({ teamId: 'team-1', userId: 'user-2' });

    const result = await teamService.addMember('ws-1', 'team-1', 'user-2', 'contributor', 'user-1');

    expect(mockTeamRepo.addMember).toHaveBeenCalledWith('team-1', 'user-2', 'contributor');
  });

  /**
   * Purpose: Validates that non-members cannot add team members
   */
  it('should throw NOT_MEMBER when actor is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.addMember('ws-1', 'team-1', 'user-2', 'contributor', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that only workspace members can be added to teams
   */
  it('should throw when target user is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue([]);

    await expect(
      teamService.addMember('ws-1', 'team-1', 'user-not-in-ws', 'contributor', 'user-1')
    ).rejects.toThrow('Team members must belong to this workspace');
  });

  /**
   * Purpose: Validates that the default member role is contributor when not specified
   */
  it('should default role to contributor when not specified', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-2']);
    mockTeamRepo.addMember.mockResolvedValue({});

    await teamService.addMember('ws-1', 'team-1', 'user-2', undefined as any, 'user-1');

    expect(mockTeamRepo.addMember).toHaveBeenCalledWith('team-1', 'user-2', 'contributor');
  });
});

describe('teamService.removeMember', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a member can be removed from a team
   */
  it('should remove a member from a team successfully', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });

    await teamService.removeMember('ws-1', 'team-1', 'user-2', 'user-1');

    expect(mockTeamRepo.removeMember).toHaveBeenCalledWith('team-1', 'user-2');
  });

  /**
   * Purpose: Validates that non-members cannot remove team members
   */
  it('should throw NOT_MEMBER when actor is not in workspace', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      teamService.removeMember('ws-1', 'team-1', 'user-2', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that removing a member from a nonexistent team throws NOT_FOUND
   */
  it('should throw NOT_FOUND when team does not exist', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue('member');
    mockTeamRepo.findById.mockResolvedValue(null);

    await expect(
      teamService.removeMember('ws-1', 'team-1', 'user-2', 'user-1')
    ).rejects.toThrow(TEAM.ERRORS.NOT_FOUND);
  });
});

describe('teamService.generateSlug', () => {
  /**
   * Purpose: Validates that team names are converted to lowercase slug format with hyphens
   */
  it('should generate a lowercase slug with hyphens', () => {
    const slug = teamService.generateSlug('Security Team');
    expect(slug).toBe('security-team');
  });

  /**
   * Purpose: Validates that special characters are stripped from slug generation
   */
  it('should remove special characters', () => {
    const slug = teamService.generateSlug('DevOps & SRE!');
    expect(slug).toBe('devops-sre');
  });

  /**
   * Purpose: Validates that multiple consecutive spaces are collapsed to single hyphens
   */
  it('should collapse multiple hyphens', () => {
    const slug = teamService.generateSlug('A   B   C');
    expect(slug).toBe('a-b-c');
  });

  /**
   * Purpose: Validates that slugs are truncated to the maximum allowed length
   */
  it('should truncate to max slug length', () => {
    const longName = 'a'.repeat(300);
    const slug = teamService.generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(255);
  });
});
