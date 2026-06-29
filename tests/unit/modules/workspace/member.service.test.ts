/**
 * Unit tests for memberService (Workspace Member Management)
 *
 * This file tests the business logic layer for:
 * - Changing member roles
 * - Removing members
 *
 * Focus is on permission checks and ownership rules.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MEMBER } from '@/server/modules/members/constants';
import { ROLE } from '@/commons/constants/permissions';

const mockRepo = {
  list: vi.fn(),
  getMemberRole: vi.fn(),
  updateMemberRole: vi.fn(),
  remove: vi.fn(),
};

const mockDb = {
  transaction: vi.fn((fn: Function) => fn(mockDb)),
};

vi.mock('@/server/modules/members/repositories/member.repository', () => ({
  memberRepository: mockRepo,
}));

vi.mock('@/server/db/client', () => ({
  db: mockDb,
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    member: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const { memberService } = await import('@/server/modules/members/services/member.service');

/**
 * Unit tests for memberService (Workspace Member Management)
 *
 * Tests business rules:
 * - Cannot change own role
 * - Cannot assign Owner role
 * - Cannot change Owner's role
 * - Manager restrictions
 */
describe('memberService.changeRole', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a member's role can be updated by an authorized actor
   */
  it('should successfully update a member role when the actor has permission', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(ROLE.MEMBER); // target role
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.REVIEWER });

    await memberService.changeRole('ws-1', 'target-user', ROLE.REVIEWER, 'actor-user');

    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target-user', ROLE.REVIEWER, expect.anything());
  });

  /**
   * Purpose: Validates that a user cannot change their own role
   */
  it('should throw CANNOT_CHANGE_OWN_ROLE when trying to change their own role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'actor', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.CANNOT_CHANGE_OWN_ROLE);
  });

  /**
   * Purpose: Validates that the Owner role cannot be assigned to any member
   */
  it('should throw CANNOT_ASSIGN_OWNER when trying to assign the Owner role', async () => {
    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.OWNER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.CANNOT_ASSIGN_OWNER);
  });

  /**
   * Purpose: Validates that the existing Owner's role cannot be changed
   */
  it('should throw CANNOT_CHANGE_OWNER_ROLE when trying to change an existing Owner role', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(ROLE.OWNER); // target role

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.MEMBER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.CANNOT_CHANGE_OWNER_ROLE);
  });

  /**
   * Purpose: Validates that changing the role of a non-member throws MEMBER_NOT_FOUND
   */
  it('should throw MEMBER_NOT_FOUND when the target user is not a member of the workspace', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER)
      .mockResolvedValueOnce(null);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MEMBER_NOT_FOUND);
  });

  it('should allow manager to assign reviewer role', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.MANAGER)
      .mockResolvedValueOnce(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.REVIEWER });

    await memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor');
    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target', ROLE.REVIEWER, expect.anything());
  });

  /**
   * Purpose: Validates that Manager cannot assign manager role
   */
  it('should throw MANAGER_RESTRICTED_ROLE when manager tries to assign manager', async () => {
    mockRepo.getMemberRole.mockResolvedValueOnce(ROLE.MANAGER);

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.MANAGER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE);
  });
});

/**
 * Unit tests for memberService.remove
 *
 * Tests business rules for removing members:
 * - Cannot remove self
 * - Cannot remove Owner
 * - Manager cannot remove Manager
 */
describe('memberService.remove', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an authorized actor can remove a workspace member
   */
  it('should successfully remove a member when performed by an authorized actor', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(ROLE.MEMBER); // target role

    await memberService.remove('ws-1', 'target', 'actor');

    expect(mockRepo.remove).toHaveBeenCalledWith('ws-1', 'target');
  });

  /**
   * Purpose: Validates that a user cannot remove themselves from a workspace
   */
  it('should throw CANNOT_REMOVE_SELF when trying to remove their own membership', async () => {
    await expect(
      memberService.remove('ws-1', 'actor', 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.CANNOT_REMOVE_SELF);
  });

  /**
   * Purpose: Validates that the workspace Owner cannot be removed
   */
  it('should throw CANNOT_REMOVE_OWNER when trying to remove the workspace Owner', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(ROLE.OWNER); // target role

    await expect(
      memberService.remove('ws-1', 'target', 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.CANNOT_REMOVE_OWNER);
  });

  /**
   * Purpose: Validates that removing a non-member throws MEMBER_NOT_FOUND
   */
  it('should throw MEMBER_NOT_FOUND when trying to remove a user who is not a member', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(null); // target role

    await expect(
      memberService.remove('ws-1', 'target', 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MEMBER_NOT_FOUND);
  });

  /**
   * Purpose: Validates that Manager cannot remove another Manager
   */
  it('should throw MANAGER_CANNOT_REMOVE_MANAGER when manager tries to remove manager', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.MANAGER) // actor role
      .mockResolvedValueOnce(ROLE.MANAGER); // target role

    await expect(
      memberService.remove('ws-1', 'target', 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MANAGER_CANNOT_REMOVE_MANAGER);
  });

  /**
   * Purpose: Validates that actor who is not a member cannot remove others
   */
  it('should throw MEMBER_NOT_FOUND when actor is not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValueOnce(null); // actor not member

    await expect(
      memberService.remove('ws-1', 'target', 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MEMBER_NOT_FOUND);
  });
});

describe('❌ negative', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a repository error propagates when listing members
   */
  it('should throw when repository.list throws', async () => {
    mockRepo.list.mockRejectedValue(new Error('DB connection failed'));

    await expect(memberService.list('ws-1')).rejects.toThrow('DB connection failed');
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
  it('should throw when repository.remove throws', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER) // actor role
      .mockResolvedValueOnce(ROLE.MEMBER); // target role
    mockRepo.remove.mockRejectedValue(new Error('DB delete failed'));

    await expect(
      memberService.remove('ws-1', 'target', 'actor')
    ).rejects.toThrow('DB delete failed');
  });
});

describe('🔲 edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that list returns an empty array when no members exist
   */
  it('should return empty array when workspace has no members', async () => {
    mockRepo.list.mockResolvedValue({ data: [], total: 0, page: 1, perPage: 10, lastPage: 0 });

    const result = await memberService.list('ws-1');
    expect(result.data).toEqual([]);
  });

  /**
   * Purpose: Validates that manager role can be assigned by owner
   */
  it('should successfully update member role to manager when actor is owner', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.OWNER)
      .mockResolvedValueOnce(ROLE.MEMBER);
    mockRepo.updateMemberRole.mockResolvedValue({ role: ROLE.MANAGER });

    await memberService.changeRole('ws-1', 'target', ROLE.MANAGER, 'actor');
    expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('ws-1', 'target', ROLE.MANAGER, expect.anything());
  });

  /**
   * Purpose: Validates that Manager cannot change another Manager's role
   */
  it('should throw MANAGER_CANNOT_CHANGE_MANAGER when manager tries to change manager role', async () => {
    mockRepo.getMemberRole
      .mockResolvedValueOnce(ROLE.MANAGER) // actor role
      .mockResolvedValueOnce(ROLE.MANAGER); // target role

    await expect(
      memberService.changeRole('ws-1', 'target', ROLE.REVIEWER, 'actor')
    ).rejects.toThrow(MEMBER.ERRORS.MANAGER_CANNOT_CHANGE_MANAGER);
  });
});
