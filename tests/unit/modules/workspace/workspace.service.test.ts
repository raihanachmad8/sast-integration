import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: {
    listByUser: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    getMemberRole: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    switchWorkspace: vi.fn(),
  },
}));

vi.mock('@/server/db/client', () => ({
  db: { transaction: vi.fn((fn) => fn({ insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'ws-1' }]) }) }) })) },
}));

import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
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
  beforeEach(() => vi.clearAllMocks());

  it('should throw on slug conflict', async () => {
    mockRepo.findBySlug.mockResolvedValue({ id: 'existing' } as never);
    await expect(workspaceService.create({ name: 'Test' }, 'user-1')).rejects.toThrow(WORKSPACE.ERRORS.SLUG_CONFLICT);
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
