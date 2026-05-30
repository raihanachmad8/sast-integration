/**
 * Unit tests for workspaceService
 *
 * Tests core workspace business logic including:
 * - Listing user workspaces
 * - Retrieving workspace with role
 * - Creation rules (especially personal workspace restrictions)
 * - Update and delete permissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
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

import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
import { env } from '@/server/env';
const mockRepo = vi.mocked(workspaceRepository);

/**
 * Unit tests for workspaceService.list
 */
/**
 * Unit tests for workspaceService.list
 */
describe('workspaceService.list', () => {
  it('should return the list of workspaces the user is a member of', async () => {
    mockRepo.listByUser.mockResolvedValue([{ id: 'ws-1', name: 'Test', slug: 'test', type: 'organization', role: ROLE.OWNER }] as never);
    const result = await workspaceService.list('user-1');
    expect(result).toHaveLength(1);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('user-1');
  });
});

/**
 * Unit tests for workspaceService.getById
 */
/**
 * Unit tests for workspaceService.getById
 */
describe('workspaceService.getById', () => {
  it('should return the workspace along with the requester\'s role in it', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', name: 'Test', slug: 'test', type: 'organization' } as never);
    const result = await workspaceService.getById('ws-1', 'user-1');
    expect(result.role).toBe(ROLE.OWNER);
  });

  it('should throw if not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.getById('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_MEMBER);
  });
});

/**
 * Unit tests for workspaceService.create
 *
 * Especially important for enforcing personal workspace rules per user.
 */
describe('workspaceService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'multiple';
  });

  it('should reject personal workspace creation when WORKSPACE_MODE is single', async () => {
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'single';

    await expect(
      workspaceService.create({ name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL }, 'user-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED);
    expect(mockRepo.findActivePersonalByOwner).not.toHaveBeenCalled();
  });

  it('should reject self-service organization workspace creation', async () => {
    await expect(workspaceService.create({ name: 'Test' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.SELF_SERVICE_DISABLED);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should reject personal workspace creation when active personal exists', async () => {
    mockRepo.findActivePersonalByOwner.mockResolvedValue({ id: 'personal-1' } as never);

    await expect(
      workspaceService.create({ name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL }, 'user-1')
    ).rejects.toThrow(WORKSPACE.ERRORS.PERSONAL_EXISTS);
  });

  it('should create personal workspace when none is active', async () => {
    mockRepo.findActivePersonalByOwner.mockResolvedValue(null);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'ws-1', name: 'Personal Workspace', slug: 'personal-user-1' } as never);
    mockRepo.addMember.mockResolvedValue(undefined);
    mockRepo.switchWorkspace.mockResolvedValue(undefined);

    const result = await workspaceService.create({ name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL }, 'user-1');

    expect(result.id).toBe('ws-1');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Personal Workspace', type: WORKSPACE.TYPE.PERSONAL, createdBy: 'user-1' }),
      expect.anything(),
    );
    expect(mockRepo.addMember).toHaveBeenCalledWith('ws-1', 'user-1', ROLE.OWNER, expect.anything());
    expect(mockRepo.switchWorkspace).toHaveBeenCalledWith('user-1', 'ws-1', expect.anything());
  });
});

/**
 * Unit tests for workspaceService.update
 *
 * Enforces that only owners can update workspace details.
 */
describe('workspaceService.update', () => {
  it('should throw NOT_OWNER when a non-owner tries to update the workspace', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.update('ws-1', { name: 'New' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  it('should successfully update the workspace when performed by the owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ id: 'ws-1', name: 'New' } as never);
    const result = await workspaceService.update('ws-1', { name: 'New' }, 'user-1');
    expect(result.name).toBe('New');
  });
});

/**
 * Unit tests for workspaceService.delete
 *
 * Important rules:
 * - Personal workspaces cannot be deleted by the user
 * - Only owners can delete organization workspaces
 */
describe('workspaceService.delete', () => {
  it('should throw CANNOT_DELETE_PERSONAL when trying to delete a personal workspace', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.PERSONAL } as never);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_DELETE_PERSONAL);
  });

  it('should throw NOT_OWNER when a non-owner tries to delete the workspace', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  it('should successfully delete an organization workspace when performed by the owner', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.delete.mockResolvedValue(undefined);
    await workspaceService.delete('ws-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('ws-1', 'user-1');
  });
});

/**
 * Unit tests for workspaceService.switchWorkspace
 *
 * Users can only switch to workspaces they are members of.
 */
describe('workspaceService.switchWorkspace', () => {
  it('should throw NOT_MEMBER when the user tries to switch to a workspace they do not belong to', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.switchWorkspace('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_MEMBER);
  });

  it('should successfully switch the user\'s active workspace when they are a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.switchWorkspace.mockResolvedValue(undefined);
    await workspaceService.switchWorkspace('ws-1', 'user-1');
    expect(mockRepo.switchWorkspace).toHaveBeenCalledWith('user-1', 'ws-1');
  });
});
