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

describe('workspaceService.list', () => {
  it('should return user workspaces', async () => {
    mockRepo.listByUser.mockResolvedValue([{ id: 'ws-1', name: 'Test', slug: 'test', type: 'organization', role: ROLE.OWNER }] as never);
    const result = await workspaceService.list('user-1');
    expect(result).toHaveLength(1);
    expect(mockRepo.listByUser).toHaveBeenCalledWith('user-1');
  });
});

describe('workspaceService.getById', () => {
  it('should return workspace with role', async () => {
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

describe('workspaceService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'multiple';
  });

  it('should reject self-service workspace creation when workspace mode is single', async () => {
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

describe('workspaceService.update', () => {
  it('should throw if not owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.update('ws-1', { name: 'New' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  it('should update if owner', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.findBySlug.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ id: 'ws-1', name: 'New' } as never);
    const result = await workspaceService.update('ws-1', { name: 'New' }, 'user-1');
    expect(result.name).toBe('New');
  });
});

describe('workspaceService.delete', () => {
  it('should throw if personal workspace', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.PERSONAL } as never);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.CANNOT_DELETE_PERSONAL);
  });

  it('should throw if not owner', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    await expect(workspaceService.delete('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_OWNER);
  });

  it('should delete if owner of org workspace', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'ws-1', type: WORKSPACE.TYPE.ORGANIZATION } as never);
    mockRepo.getMemberRole.mockResolvedValue(ROLE.OWNER);
    mockRepo.delete.mockResolvedValue(undefined);
    await workspaceService.delete('ws-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('ws-1', 'user-1');
  });
});

describe('workspaceService.switchWorkspace', () => {
  it('should throw if not a member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(null);
    await expect(workspaceService.switchWorkspace('ws-1', 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.NOT_MEMBER);
  });

  it('should switch if member', async () => {
    mockRepo.getMemberRole.mockResolvedValue(ROLE.MEMBER);
    mockRepo.switchWorkspace.mockResolvedValue(undefined);
    await workspaceService.switchWorkspace('ws-1', 'user-1');
    expect(mockRepo.switchWorkspace).toHaveBeenCalledWith('user-1', 'ws-1');
  });
});
