/**
 * Unit tests for teamService.
 *
 * Covers team listing enrichment and multi-member assignment through create/update.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@/commons/constants/permissions';

const mockTeamRepo = {
  listByWorkspaceWithSummaries: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  setMembers: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  listMembers: vi.fn(),
};

const mockWorkspaceRepo = {
  getMemberRole: vi.fn(),
  findMemberUserIds: vi.fn(),
};

vi.mock('@/server/modules/teams/repositories/team.repository', () => ({
  teamRepository: mockTeamRepo,
}));

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: mockWorkspaceRepo,
}));

const { teamService } = await import('@/server/modules/teams/services/team.service');

describe('teamService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify team listing delegates summary enrichment to the repository batch method.
   */
  it('should list teams using the repository batch summary query', async () => {
    const rows = [
      { id: 'team-1', workspaceId: 'ws-1', name: 'Security', memberCount: 2, projects: ['API'] },
    ];
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockTeamRepo.listByWorkspaceWithSummaries.mockResolvedValue(rows);

    const result = await teamService.list('ws-1', 'user-1');

    expect(result).toEqual(rows);
    expect(mockTeamRepo.listByWorkspaceWithSummaries).toHaveBeenCalledWith('ws-1');
  });
});

describe('teamService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify create assigns the full multi-select member list in one operation.
   */
  it('should validate and set selected members when creating a team', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue(null);
    mockTeamRepo.create.mockResolvedValue({ id: 'team-1', name: 'Security' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1', 'user-2']);

    await teamService.create(
      'ws-1',
      { name: 'Security', slug: 'security', memberIds: ['user-1', 'user-2', 'user-1'] },
      'owner-1',
    );

    expect(mockWorkspaceRepo.findMemberUserIds).toHaveBeenCalledWith('ws-1', ['user-1', 'user-2']);
    expect(mockTeamRepo.setMembers).toHaveBeenCalledWith('team-1', ['user-1', 'user-2']);
  });

  /**
   * Purpose: Verify create rejects selected users that are not members of the workspace.
   */
  it('should reject selected team members outside the workspace', async () => {
    mockTeamRepo.findBySlug.mockResolvedValue(null);
    mockTeamRepo.create.mockResolvedValue({ id: 'team-1', name: 'Security' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-1']);

    await expect(
      teamService.create(
        'ws-1',
        { name: 'Security', slug: 'security', memberIds: ['user-1', 'user-2'] },
        'owner-1',
      ),
    ).rejects.toThrow('Team members must belong to this workspace');
  });
});

describe('teamService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify update replaces members using the submitted multi-select list.
   */
  it('should replace selected members when memberIds is provided', async () => {
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(ROLE.MANAGER);
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1', slug: 'security' });
    mockTeamRepo.update.mockResolvedValue({ id: 'team-1', name: 'Security' });
    mockWorkspaceRepo.findMemberUserIds.mockResolvedValue(['user-3']);

    await teamService.update(
      'ws-1',
      'team-1',
      { name: 'Security', memberIds: ['user-3'] },
      'manager-1',
    );

    expect(mockWorkspaceRepo.findMemberUserIds).toHaveBeenCalledWith('ws-1', ['user-3']);
    expect(mockTeamRepo.setMembers).toHaveBeenCalledWith('team-1', ['user-3']);
  });
});

describe('teamService.listMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify the team detail drawer can receive member detail records from the service.
   */
  it('should return team members with user details', async () => {
    const members = [
      { id: 'membership-1', userId: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'contributor' },
    ];
    mockWorkspaceRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockTeamRepo.findById.mockResolvedValue({ id: 'team-1', workspaceId: 'ws-1' });
    mockTeamRepo.listMembers.mockResolvedValue(members);

    const result = await teamService.listMembers('ws-1', 'team-1', 'user-1');

    expect(result).toEqual(members);
    expect(mockTeamRepo.listMembers).toHaveBeenCalledWith('team-1');
  });
});
