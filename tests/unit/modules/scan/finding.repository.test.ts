import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies at module level
vi.mock('@/server/db/client', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('@drizzle/schema/findings', () => ({
  findings: {},
  findingGroups: {},
  aiVerifications: {},
  findingHistory: {},
}));

vi.mock('@drizzle/schema/projects', () => ({
  projects: {},
}));

vi.mock('@drizzle/schema/scans', () => ({
  scans: {},
}));

vi.mock('@drizzle/schema/source-controls', () => ({
  repositories: {},
}));

vi.mock('@drizzle/schema/integrations', () => ({
  models: {},
}));

describe('findingRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export findingRepository', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository).toBeDefined();
    expect(typeof findingRepository.createMany).toBe('function');
    expect(typeof findingRepository.create).toBe('function');
    expect(typeof findingRepository.findById).toBe('function');
    expect(typeof findingRepository.listByProject).toBe('function');
    expect(typeof findingRepository.listByScan).toBe('function');
    expect(typeof findingRepository.updateStatus).toBe('function');
    expect(typeof findingRepository.updateAssignment).toBe('function');
    expect(typeof findingRepository.getVerifications).toBe('function');
  });

  it('should have createMany method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.createMany).toBeInstanceOf(Function);
  });

  it('should have listByProject method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.listByProject).toBeInstanceOf(Function);
  });

  it('should have listByScan method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.listByScan).toBeInstanceOf(Function);
  });

  it('should have updateStatus method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.updateStatus).toBeInstanceOf(Function);
  });

  it('should have updateAssignment method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.updateAssignment).toBeInstanceOf(Function);
  });
});
