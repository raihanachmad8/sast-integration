/**
 * Unit tests for session expiry logic inside authRepository.findSession.
 *
 * These tests verify that:
 * - Valid (non-expired) sessions are returned
 * - Expired sessions are treated as not found and cleaned up (deleted)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const selectResult: unknown[] = [];
const deleteWhere = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(selectResult) }) }) }),
  delete: () => ({ where: deleteWhere }),
};

vi.mock('@/server/db/client', () => ({ db: mockDb }));

const { authRepository } = await import('@/server/modules/auth/repositories/auth.repository');

/**
 * Tests specifically focused on session expiry behavior.
 */
describe('authRepository.findSession — expiry', () => {
  beforeEach(() => {
    selectResult.length = 0;
    deleteWhere.mockClear();
  });

  /**
   * Purpose: A missing session should return null without triggering any deletion.
   */
  it('should return null when session not found', async () => {
    const result = await authRepository.findSession('missing');
    expect(result).toBeNull();
  });

  /**
   * Purpose: A valid non-expired session should be returned and no cleanup should occur.
   */
  it('should return session when not expired', async () => {
    const future = new Date(Date.now() + 60_000);
    selectResult.push({ id: 's1', expiresAt: future });

    const result = await authRepository.findSession('s1');
    expect(result).not.toBeNull();
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  /**
   * Purpose: An expired session should be treated as not found and the record should be deleted as cleanup.
   */
  it('should return null and delete the record when session has expired', async () => {
    const past = new Date(Date.now() - 60_000);
    selectResult.push({ id: 's2', expiresAt: past });

    const result = await authRepository.findSession('s2');
    expect(result).toBeNull();
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});
