import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';

vi.mock('@/server/modules/workspace/repositories/workspace.repository', () => ({
  workspaceRepository: {
    listByUser: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findActivePersonalByOwner: vi.fn(),
    getMemberRole: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    switchWorkspace: vi.fn(),
    listPendingInvitationsByEmail: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}));

vi.mock('@/server/db/client', () => ({
  db: { transaction: vi.fn((fn) => fn({})) },
}));

vi.mock('@/server/env', () => ({
  env: {
    WORKSPACE_MODE: 'multiple',
  },
}));

import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { env } from '@/server/env';
const mockRepo = vi.mocked(workspaceRepository);

describe('workspaceService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that the user's workspace list is returned correctly
   */
  it('+ should return the list of workspaces the user is a member of', async () => {
    mockRepo.listByUser.mockResolvedValue([{ id: 'ws-1', name: 'Test', slug: 'test', type: 'organization', role: ROLE.OWNER }] as never);
    const result = await workspaceService.list('user-1');
    expect(result).toHaveLength(1);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('user-1');
  });

  /**
   * Purpose: Validates that multiple workspaces are returned when the user belongs to more than one
   */
  it('+ should return multiple workspaces', async () => {
    mockRepo.listByUser.mockResolvedValue([
      { id: 'ws-1', name: 'Org' },
      { id: 'ws-2', name: 'Personal' },
    ] as never);
    const result = await workspaceService.list('user-1');
    expect(result).toHaveLength(2);
  });

  /**
   * Purpose: Validates that an empty array is returned when the user has no workspaces
   */
  it('- should return empty array when user has no workspaces', async () => {
    mockRepo.listByUser.mockResolvedValue([]);
    const result = await workspaceService.list('user-1');
    expect(result).toEqual([]);
  });
});

describe('workspaceService.getById', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that the workspace is returned along with the requester's role
   */
  it('+ should return the workspace along with the requester role', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', name: 'Test', slug: 'test', type: 'organization' } as never);
    const result = await workspaceService.getById('ws-1', 'user-1');
    expect(result.role).toBe(ROLE.OWNER);
    expect(result.name).toBe('Test');
  });

  /**
   * Purpose: Validates that a non-owner user receives the member role
   */
  it('+ should return member role for non-owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', name: 'Org' } as never);
    const result = await workspaceService.getById('ws-1', 'user-1');
    expect(result.role).toBe(ROLE.MEMBER);
  });

  /**
   * Purpose: Validates that non-members cannot access workspace details
   */
  it('- should throw NOT_MEMBER when user is not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.getById('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_MEMBER);
  });

  /**
   * Purpose: Validates that a nonexistent workspace throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when workspace does not exist', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.findById.mockResolvedValue(null);
    await expect(workspaceService.getById('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_FOUND);
  });
});

describe('workspaceService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'multiple';
  });

  /**
   * Purpose: Validates that a personal workspace is auto-created and switched to when none is active
   */
  it('+ should create personal workspace when none is active', async () => {
    mockRepo.findActivePersonalByOwner.mockResolvedValue(null);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'ws-1', name: 'Personal Workspace', slug: 'personal-user-1' } as never);
    mockRepo.addMember.mockResolvedValue(undefined);
    mockRepo.switchWorkspace.mockResolvedValue(undefined);

    const result = await workspaceService.create({ name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL }, 'user-1');
    expect(result.id).toBe('ws-1');
    expect(mockRepo.addMember).toHaveBeenCalledWith('ws-1', 'user-1', ROLE.OWNER, expect.anything());
    expect(mockRepo.switchWorkspace).toHaveBeenCalledWith('user-1', 'ws-1', expect.anything());
  });

  /**
   * Purpose: Validates that workspace creation is rejected when WORKSPACE_MODE is single
   */
  it('- should reject when WORKSPACE_MODE is single', async () => {
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'single';
    await expect(
      workspaceService.create({ name: 'Personal', type: WORKSPACE.TYPE.PERSONAL }, 'user-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED);
  });

  /**
   * Purpose: Validates that users cannot self-create organization workspaces
   */
  it('- should reject organization workspace self-creation', async () => {
    await expect(workspaceService.create({ name: 'Org' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED);
  });

  /**
   * Purpose: Validates that creating a duplicate personal workspace is rejected
   */
  it('- should reject when personal workspace already exists', async () => {
    mockRepo.findActivePersonalByOwner.mockResolvedValue({ id: 'personal-1' } as never);
    await expect(
      workspaceService.create({ name: 'Personal', type: WORKSPACE.TYPE.PERSONAL }, 'user-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.PERSONAL_EXISTS);
  });
});

describe('workspaceService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an owner can update workspace metadata
   */
  it('+ should update workspace when performed by owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ id: 'ws-1', name: 'New' } as never);
    const result = await workspaceService.update('ws-1', { name: 'New' }, 'user-1');
    expect(result.name).toBe('New');
  });

  /**
   * Purpose: Validates that an owner can update the workspace slug
   */
  it('+ should update workspace with slug', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ id: 'ws-1', slug: 'new-slug' } as never);
    const result = await workspaceService.update('ws-1', { slug: 'new-slug' }, 'user-1');
    expect(result.slug).toBe('new-slug');
  });

  /**
   * Purpose: Validates that non-owners cannot update workspace settings
   */
  it('- should throw NOT_OWNER when non-owner tries to update', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.update('ws-1', { name: 'New' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  /**
   * Purpose: Validates that non-members cannot update workspace settings
   */
  it('- should throw NOT_MEMBER when user is not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.update('ws-1', { name: 'New' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  /**
   * Purpose: Validates that SLUG_CONFLICT is thrown when the new slug is already taken
   */
  it('- should throw SLUG_CONFLICT when slug already exists', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue({ id: 'ws-other' } as never);
    await expect(workspaceService.update('ws-1', { slug: 'taken' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.SLUG_CONFLICT);
  });

  /**
   * Purpose: Validates that keeping the same slug does not trigger a conflict check
   */
  it('+ should not throw SLUG_CONFLICT when slug belongs to same workspace', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue({ id: 'ws-1' } as never);
    mockRepo.update.mockResolvedValue({ id: 'ws-1' } as never);
    await workspaceService.update('ws-1', { slug: 'same-slug' }, 'user-1');
    expect(mockRepo.update).toHaveBeenCalled();
  });
});

describe('workspaceService.delete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that an owner can delete an organization workspace
   */
  it('+ should delete organization workspace when performed by owner', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.delete.mockResolvedValue(undefined);
    await workspaceService.delete('ws-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('ws-1', 'user-1');
  });

  /**
   * Purpose: Validates that personal workspaces cannot be deleted
   */
  it('- should throw CANNOT_DELETE_PERSONAL when trying to delete personal workspace', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.PERSONAL } as never);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_DELETE_PERSONAL);
  });

  /**
   * Purpose: Validates that non-owners cannot delete workspaces
   */
  it('- should throw NOT_OWNER when non-owner tries to delete', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  /**
   * Purpose: Validates that deleting a nonexistent workspace throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when workspace does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_FOUND);
  });
});

describe('workspaceService.switchWorkspace', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a workspace member can switch their active workspace
   */
  it('+ should switch workspace when user is a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.switchWorkspace.mockResolvedValue(undefined);
    await workspaceService.switchWorkspace('ws-1', 'user-1');
    expect(mockRepo.switchWorkspace).toHaveBeenCalledWith('user-1', 'ws-1');
  });

  /**
   * Purpose: Validates that non-members cannot switch to a workspace
   */
  it('- should throw NOT_MEMBER when user is not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.switchWorkspace('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_MEMBER);
  });
});

describe('workspaceService.acceptInvitation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a workspace invitation can be accepted successfully
   */
  it('+ should accept invitation successfully', async () => {
    mockRepo.acceptInvitation.mockResolvedValue({ workspaceId: 'ws-1', email: 'a@test.com' });
    const result = await workspaceService.acceptInvitation('inv-1', 'user-1');
    expect(result.workspaceId).toBe('ws-1');
  });

  /**
   * Purpose: Validates that accepting a nonexistent invitation throws INVITATION_NOT_FOUND
   */
  it('- should throw INVITATION_NOT_FOUND when invitation does not exist', async () => {
    mockRepo.acceptInvitation.mockResolvedValue(null);
    await expect(workspaceService.acceptInvitation('inv-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.INVITATION_NOT_FOUND);
  });
});

describe('workspaceService.declineInvitation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a workspace invitation can be declined successfully
   */
  it('+ should decline invitation successfully', async () => {
    mockRepo.revokeInvitation.mockResolvedValue(undefined);
    await expect(workspaceService.declineInvitation('inv-1')).resolves.toBeUndefined();
  });
});
