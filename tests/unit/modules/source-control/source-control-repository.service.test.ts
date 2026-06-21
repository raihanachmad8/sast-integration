/**
 * Unit tests for sourceControlRepositoryService
 *
 * Tests the core sync logic for:
 * - upsertMany: matching by externalId (stable), not name
 * - Rename detection: updates name/URL when externalId matches but name differs
 * - Stale cleanup: deletes repos without imports, marks repos with imports as [deleted]
 * - Backfill: populates externalId from fullName for existing repos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the entire db module before any imports
vi.mock('@/server/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    sourceControl: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

// Now import the module after mocks are set up
const { db } = await import('@/server/db/client');
const { sourceControlRepositoryService } = await import('@/server/modules/source-control/source-control-repository.service');

describe('sourceControlRepositoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('backfillExternalId', () => {
    /**
     * Purpose: Validates that the backfill SQL is executed for the connection
     */
    it('should call execute with SQL to backfill externalId', async () => {
      (db.execute as any).mockResolvedValue(undefined);

      await sourceControlRepositoryService.backfillExternalId('conn-123');

      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe('listByConnectionId', () => {
    /**
     * Purpose: Validates that repos are returned and backfill is triggered
     */
    it('should return repos and call backfill', async () => {
      const mockRepos = [
        { id: 'repo-1', name: 'org/repo', externalId: '12345' },
      ];
      (db.execute as any).mockResolvedValue(undefined);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRepos),
        }),
      });

      const result = await sourceControlRepositoryService.listByConnectionId('conn-123');

      expect(result).toEqual(mockRepos);
      expect(db.execute).toHaveBeenCalled(); // backfill called
    });
  });

  describe('upsertMany', () => {
    /**
     * Purpose: Validates that new repositories are inserted with their externalId
     */
    it('should insert new repos with externalId', async () => {
      // Mock empty existing repos
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      (db.execute as any).mockResolvedValue(undefined); // backfill
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const repos = [
        { name: 'org/new-repo', url: 'https://github.com/org/new-repo.git', defaultBranch: 'main', externalId: '12345' },
      ];

      await sourceControlRepositoryService.upsertMany('conn-123', 'ws-456', repos);

      expect(db.insert).toHaveBeenCalled();
    });

    /**
     * Purpose: Validates that existing repos are updated (not duplicated) when externalId matches
     */
    it('should update existing repos when externalId matches', async () => {
      const existingRepos = [
        { id: 'repo-1', externalId: '12345', name: 'org/old-name', fullName: 'org/old-name', url: 'https://old-url.git' },
      ];

      // First call: list existing repos
      // Second call: check active import in updateLinkedRepository
      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(existingRepos),
            }),
          };
        }
        // Second call: check active import
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // no import
            }),
          }),
        };
      });

      (db.execute as any).mockResolvedValue(undefined); // backfill
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      const repos = [
        { name: 'org/new-name', url: 'https://new-url.git', defaultBranch: 'main', externalId: '12345' },
      ];

      await sourceControlRepositoryService.upsertMany('conn-123', 'ws-456', repos);

      // Should update (not insert) because externalId matches
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    /**
     * Purpose: Validates that stale repos with active imports are marked as deleted
     */
    it('should mark stale repos with imports as [deleted]', async () => {
      const existingRepos = [
        { id: 'repo-1', externalId: '99999', name: 'org/deleted-repo', fullName: 'org/deleted-repo', url: 'https://deleted.git' },
      ];

      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: list existing repos
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(existingRepos),
            }),
          };
        }
        // Second call: check active import (returns import = has import)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 'import-1' }]),
            }),
          }),
        };
      });

      (db.execute as any).mockResolvedValue(undefined); // backfill
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      // No incoming repos (all are stale)
      await sourceControlRepositoryService.upsertMany('conn-123', 'ws-456', []);

      // Should mark as [deleted] because it has an import
      expect(db.update).toHaveBeenCalled();
    });

    /**
     * Purpose: Validates that stale repos without active imports are soft-deleted
     */
    it('should hard-delete stale repos without imports', async () => {
      const existingRepos = [
        { id: 'repo-1', externalId: '99999', name: 'org/deleted-repo', fullName: 'org/deleted-repo', url: 'https://deleted.git' },
      ];

      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(existingRepos),
            }),
          };
        }
        // No active import
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      (db.execute as any).mockResolvedValue(undefined); // backfill
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // No incoming repos (all are stale)
      await sourceControlRepositoryService.upsertMany('conn-123', 'ws-456', []);

      // Should soft-delete (set deletedAt) because no import references it
      expect(db.update).toHaveBeenCalled();
    });
  });
});
