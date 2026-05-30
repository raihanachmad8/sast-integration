import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';

const mockRepo = {
  listMembers: vi.fn(),
  getMemberRole: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  listInvitations: vi.fn(),
  findInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
};

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: mockRepo,
}));

const { memberService } = await import('@/server/modules/workspace/member.service');

describe('memberService.changeRole', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should change role successfully', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.REVIEWER });

    await memberService.changeRole('ws-1', 'target-user', ROLE.REVIEWER, 'actor-user');

    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target-user', ROLE.REVIEWER);
  });

  it('should reject changing own role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'actor', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWN_ROLE);
  });

  it('should reject assigning owner role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.OWNER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_ASSIGN_OWNER);
  });

  it('should reject changing owner role', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.MEMBER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWNER_ROLE);
  });

  it('should reject if target not found', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.MEMBER_NOT_FOUND);
  });
});

describe('memberService.removeMember', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should remove member successfully', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);

    await memberService.removeMember('ws-1', 'target', 'actor');

    expect(mockRepo.removeMember).toHaveBeenCalledWith('ws-1', 'target');
  });

  it('should reject removing self', async () => {
    await expect(
      memberService.removeMember('ws-1', 'actor', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_SELF);
  });

  it('should reject removing owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_OWNER);
  });

  it('should reject if target not found', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.MEMBER_NOT_FOUND);
  });
});

describe('memberService.revokeInvitation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should revoke invitation successfully', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-1' });

    await memberService.revokeInvitation('ws-1', 'inv-1');

    expect(mockRepo.revokeInvitation).toHaveBeenCalledWith('inv-1');
  });

  it('should reject if invitation not found', async () => {
    mockRepo.findInvitation.mockResolvedValue(null);

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });

  it('should reject if invitation belongs to different workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-other' });

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });
});
