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

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: mockRepo,
}));

const { memberService } = await import('@/server/modules/workspace/member.service');

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

  it('should successfully update a member role when the actor has permission', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.REVIEWER });

    await memberService.changeRole('ws-1', 'target-user', ROLE.REVIEWER, 'actor-user');

    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target-user', ROLE.REVIEWER);
  });

  it('should throw CANNOT_CHANGE_OWN_ROLE when trying to change their own role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'actor', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWN_ROLE);
  });

  it('should throw CANNOT_ASSIGN_OWNER when trying to assign the Owner role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.OWNER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_ASSIGN_OWNER);
  });

  it('should throw CANNOT_CHANGE_OWNER_ROLE when trying to change an existing Owner role', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.MEMBER, 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_CHANGE_OWNER_ROLE);
  });

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

  it('should successfully remove a member when performed by an authorized actor', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);

    await memberService.removeMember('ws-1', 'target', 'actor');

    expect(mockRepo.removeMember).toHaveBeenCalledWith('ws-1', 'target');
  });

  it('should throw CANNOT_REMOVE_SELF when trying to remove their own membership', async () => {
    await expect(
      memberService.removeMember('ws-1', 'actor', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_SELF);
  });

  it('should throw CANNOT_REMOVE_OWNER when trying to remove the workspace Owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);

    await expect(
      memberService.removeMember('ws-1', 'target', 'actor')
    ).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_REMOVE_OWNER);
  });

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

  it('should successfully revoke an invitation that belongs to the workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-1' });

    await memberService.revokeInvitation('ws-1', 'inv-1');

    expect(mockRepo.revokeInvitation).toHaveBeenCalledWith('inv-1');
  });

  it('should throw INVITATION_NOT_FOUND when the invitation does not exist', async () => {
    mockRepo.findInvitation.mockResolvedValue(null);

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });

  it('should throw INVITATION_NOT_FOUND when the invitation belongs to a different workspace', async () => {
    mockRepo.findInvitation.mockResolvedValue({ id: 'inv-1', workspaceId: 'ws-other' });

    await expect(
      memberService.revokeInvitation('ws-1', 'inv-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });
});
