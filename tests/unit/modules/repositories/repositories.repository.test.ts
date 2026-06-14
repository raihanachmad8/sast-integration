import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies at module level
vi.mock('@/server/db/client', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock('@drizzle/schema/source-controls', () => ({
  repositories: {
    id: 'id',
    workspaceId: 'workspaceId',
    projectId: 'projectId',
    name: 'name',
    url: 'url',
    defaultBranch: 'defaultBranch',
    connectionType: 'connectionType',
    autoScan: 'autoScan',
    deletedAt: 'deletedAt',
    createdBy: 'createdBy',
    updatedBy: 'updatedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}));

describe('repositoriesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export repositoriesRepository', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository).toBeDefined();
    expect(typeof repositoriesRepository.listByWorkspace).toBe('function');
    expect(typeof repositoriesRepository.getById).toBe('function');
    expect(typeof repositoriesRepository.create).toBe('function');
    expect(typeof repositoriesRepository.update).toBe('function');
    expect(typeof repositoriesRepository.delete).toBe('function');
    expect(typeof repositoriesRepository.findByUrl).toBe('function');
    expect(typeof repositoriesRepository.findByNameAndWorkspace).toBe('function');
  });

  it('should have listByWorkspace method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.listByWorkspace).toBeInstanceOf(Function);
  });

  it('should have getById method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.getById).toBeInstanceOf(Function);
  });

  it('should have create method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.create).toBeInstanceOf(Function);
  });

  it('should have update method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.update).toBeInstanceOf(Function);
  });

  it('should have delete method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.delete).toBeInstanceOf(Function);
  });

  it('should have findByUrl method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.findByUrl).toBeInstanceOf(Function);
  });

  it('should have findByNameAndWorkspace method', async () => {
    const { repositoriesRepository } = await import('@/server/modules/repositories/repositories.repository');
    expect(repositoriesRepository.findByNameAndWorkspace).toBeInstanceOf(Function);
  });
});
