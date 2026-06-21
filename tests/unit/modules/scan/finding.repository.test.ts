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

  /**
   * Purpose: Validates that the findingRepository exports all required methods
   */
  it('should export findingRepository', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository).toBeDefined();
    expect(typeof findingRepository.createMany).toBe('function');
    expect(typeof findingRepository.create).toBe('function');
    expect(typeof findingRepository.findById).toBe('function');
    expect(typeof findingRepository.findGroupById).toBe('function');
    expect(typeof findingRepository.listByProject).toBe('function');
    expect(typeof findingRepository.listByScan).toBe('function');
    expect(typeof findingRepository.updateGroupStatus).toBe('function');
    expect(typeof findingRepository.updateAssignment).toBe('function');
    expect(typeof findingRepository.getVerifications).toBe('function');
  });

  /**
   * Purpose: Validates that the createMany method is available on the repository
   */
  it('should have createMany method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.createMany).toBeInstanceOf(Function);
  });

  /**
   * Purpose: Validates that the listByProject method is available on the repository
   */
  it('should have listByProject method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.listByProject).toBeInstanceOf(Function);
  });

  /**
   * Purpose: Validates that the listByScan method is available on the repository
   */
  it('should have listByScan method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.listByScan).toBeInstanceOf(Function);
  });

  /**
   * Purpose: Validates that the updateGroupStatus method is available on the repository
   */
  it('should have updateGroupStatus method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.updateGroupStatus).toBeInstanceOf(Function);
  });

  /**
   * Purpose: Validates that the updateAssignment method is available on the repository
   */
  it('should have updateAssignment method', async () => {
    const { findingRepository } = await import('@/server/modules/scan/repositories/finding.repository');
    expect(findingRepository.updateAssignment).toBeInstanceOf(Function);
  });
});
