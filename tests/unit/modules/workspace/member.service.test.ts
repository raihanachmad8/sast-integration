/**
 * Unit tests for memberService (Workspace Member & Invitation Management)
 *
 * This file tests the business logic layer for:
 * - Changing member roles
 * - Removing members
 * - Revoking invitations
 *
 * Focus is on permission checks and ownership rules.
 */
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

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: mockRepo,
}));

const { memberService } = await import('@/server/modules/workspace/services/member.service');

/**
 * Unit tests for memberService (Workspace Member Management)
 *
 * Menguji business rules penting seperti:
 * - Tidak boleh mengubah role sendiri
 * - Tidak boleh assign role Owner
 * - Tidak boleh mengubah role Owner
 * - Validasi anggota workspace
 */
describe('memberService.changeRole', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a member's role can be updated by an authorized actor
   */
  it('should successfully update a member role when the actor has permission', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.REVIEWER });

    await memberService.changeRole('ws-1', 'target-user', ROLE.REVIEWER, 'actor-user');

    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target-user', ROLE.REVIEWER);
  });

  /**
   * Purpose: Validates that a user cannot change their own role
   */
  it('should throw CANNOT_CHANGE_OWN_ROLE when trying to change their own role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'actor', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWN_ROLE);
  });

  /**
   * Purpose: Validates that the Owner role cannot be assigned to any member
   */
  it('should throw CANNOT_ASSIGN_OWNER when trying to assign the Owner role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.OWNER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_ASSIGN_OWNER);
  });

  /**
   * Purpose: Validates that the existing Owner's role cannot be changed
   */
  it('should throw CANNOT_CHANGE_OWNER_ROLE when trying to change an existing Owner role', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.MEMBER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWNER_ROLE);
  });

  /**
   * Purpose: Validates that changing the role of a non-member throws MEMBER_NOT_FOUND
   */
  it('should throw MEMBER_NOT_FOUND when the target user is not a member of the workspace', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.MEMBER_NOT_FOUND);
  });
});

/**
 * Unit tests for memberService.removeMember
 *
 * Fokus pada aturan bisnis penghapusan anggota:
 * - Tidak boleh menghapus diri sendiri
 * - Tidak boleh menghapus Owner
 * - Hanya Owner/Manager yang boleh menghapus
 */
describe('memberService.removeMember', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an authorized actor can remove a workspace member
   */
  it('should successfully remove a member when performed by an authorized actor', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);

    await memberService.removeMember('ws-1', 'target', 'actor');

    expect(mockRepo.removeMember).toHaveBeenCalledWith('ws-1', 'target');
  });

  /**
   * Purpose: Validates that a user cannot remove themselves from a workspace
   */
  it('should throw CANNOT_REMOVE_SELF when trying to remove their own membership', async () => {
    await expect(
      memberService.removeMember('ws-1', 'actor', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_SELF);
  });

  /**
   * Purpose: Validates that the workspace Owner cannot be removed
   */
  it('should throw CANNOT_REMOVE_OWNER when trying to remove the workspace Owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_OWNER);
  });

  /**
   * Purpose: Validates that removing a non-member throws MEMBER_NOT_FOUND
   */
  it('should throw MEMBER_NOT_FOUND when trying to remove a user who is not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.MEMBER_NOT_FOUND);
  });
});

/**
 * Unit tests for memberService.revokeInvitation
 *
 * Tests the rules for revoking pending invitations:
 * - Must belong to the correct workspace
 * - Must exist
 */
describe('memberService.revokeInvitation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a workspace invitation can be revoked successfully
   */
  it('should successfully revoke an invitation that belongs to the workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-1' });

    await memberService.revokeInvitation('ws-1', 'inv-1');

    expect(mockRepo.revokeInvitation).toHaveBeenCalledWith('inv-1');
  });

  /**
   * Purpose: Validates that revoking a nonexistent invitation throws INVITATION_NOT_FOUND
   */
  it('should throw INVITATION_NOT_FOUND when the invitation does not exist', async () => {
    mockRepo.findInvitation.mockResolvedValue(null);

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });

  /**
   * Purpose: Validates that revoking an invitation from a different workspace throws INVITATION_NOT_FOUND
   */
  it('should throw INVITATION_NOT_FOUND when the invitation belongs to a different workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-other' });

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });
});

describe('❌ negative', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a repository error propagates when listing members
   */
  it('should throw when repository.listMembers throws', async () => {
    mockRepo.listMembers.mockRejectedValue(new Error('DB connection failed'));

    await expect(memberService.listMembers('ws-1')).rejects.toThrow('DB connection failed');
  });

  /**
   * Purpose: Validates that a repository error propagates when changing a role
   */
  it('should throw when repository.getMemberRole throws during changeRole', async () => {
    mockRepo.getMemberRole.mockRejectedValue(new Error('DB timeout'));

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow('DB timeout');
  });

  /**
   * Purpose: Validates that a repository error propagates when removing a member
   */
  it('should throw when repository.removeMember throws', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.removeMember.mockRejectedValue(new Error('DB delete failed'));

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow('DB delete failed');
  });

  /**
   * Purpose: Validates that a repository error propagates when listing invitations
   */
  it('should throw when repository.listInvitations throws', async () => {
    mockRepo.listInvitations.mockRejectedValue(new Error('DB connection failed'));

    await expect(memberService.listInvitations('ws-1')).rejects.toThrow('DB connection failed');
  });
});

describe('🔲 edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that listMembers returns an empty array when no members exist
   */
  it('should return empty array when workspace has no members', async () => {
    mockRepo.listMembers.mockResolvedValue([]);

    const result = await memberService.listMembers('ws-1');
    expect(result).toEqual([]);
  });

  /**
   * Purpose: Validates that listInvitations returns an empty array when no invitations exist
   */
  it('should return empty array when workspace has no invitations', async () => {
    mockRepo.listInvitations.mockResolvedValue([]);

    const result = await memberService.listInvitations('ws-1');
    expect(result).toEqual([]);
  });

  /**
   * Purpose: Validates that revokeInvitation works when invitation exists and belongs to the workspace
   */
  it('should successfully revoke invitation that belongs to workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-1' });
    mockRepo.revokeInvitation.mockResolvedValue(undefined);

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that manager role can be assigned as a valid role change
   */
  it('should successfully update member role to manager', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.MANAGER });

    await memberService.changeRole('ws-1', 'target', ROLE.MANAGER, 'actor');
    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target', ROLE.MANAGER);
  });
});
