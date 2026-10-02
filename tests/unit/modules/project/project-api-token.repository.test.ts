/**
 * Unit tests for projectApiTokenRepository
 *
 * Tests token lifecycle management including:
 * - Token generation (bcrypt hashing, prefix extraction, raw token return)
 * - Token validation (bcrypt comparison, expiry check, revocation check)
 * - Scoped lookup (per-project) vs global lookup
 * - Revocation (soft delete) and last-used tracking
 * - Security: raw token is never stored, only returned once on create
 *
 * Focus is on the repository's business logic and security guarantees,
 * not on the underlying Drizzle query mechanics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocked functions via vi.hoisted (accessible inside vi.mock factories) ---

const { mockHash, mockCompare, mockRandomBytes } = vi.hoisted(() => ({
  mockHash: vi.fn().mockResolvedValue('$2a$10$hashedtokenvalue'),
  mockCompare: vi.fn().mockResolvedValue(true),
  mockRandomBytes: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('abcdefghijklmnopqrstuvwx'),
  }),
}));

vi.mock('bcryptjs', () => ({
  hash: (...args: unknown[]) => mockHash(...args),
  compare: (...args: unknown[]) => mockCompare(...args),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: (...args: unknown[]) => mockRandomBytes(...args),
  },
}));

// --- Inline mock for db (no vi.hoisted needed since we don't reference external vars) ---

const mockDbSelectResult: unknown[] = [];

vi.mock('@/server/db/client', () => {
  function createChain() {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    // Make the chain thenable so `await db.select().from().where(...)` resolves
    c.then = undefined as unknown as ReturnType<typeof vi.fn>;

    c.select = vi.fn().mockReturnValue(c);
    c.from = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(c);
    c.limit = vi.fn().mockReturnValue(c);
    c.orderBy = vi.fn().mockReturnValue(c);
    c.insert = vi.fn().mockReturnValue(c);
    c.values = vi.fn().mockReturnValue(c);
    c.returning = vi.fn().mockReturnValue(c);
    c.update = vi.fn().mockReturnValue(c);
    c.set = vi.fn().mockReturnValue(c);

    // When the chain is awaited, resolve with the mock result
    c.then = function (resolve: (value: unknown) => void) {
      resolve([...mockDbSelectResult]);
    } as unknown as ReturnType<typeof vi.fn>;

    return c;
  }

  const chain = createChain();

  return {
    db: {
      select: (...args: unknown[]) => (chain.select as Function)(...args),
      insert: (...args: unknown[]) => (chain.insert as Function)(...args),
      update: (...args: unknown[]) => (chain.update as Function)(...args),
      transaction: vi.fn(async (fn: (tx: typeof chain) => Promise<unknown>) => fn(chain)),
    },
    _chain: chain,
  };
});

import { projectApiTokenRepository } from '@/server/modules/project/repositories/project-api-token.repository';
 
const { _chain: dbChain } = await import('@/server/db/client') as any;

// --- Helpers ---------------------------------------------------------------

function setDbResult(rows: unknown[]) {
  mockDbSelectResult.length = 0;
  mockDbSelectResult.push(...rows);
}

function clearDbResults() {
  mockDbSelectResult.length = 0;
}

// --- Tests ---------------------------------------------------------------

/**
 * Unit tests for projectApiTokenRepository.create
 *
 * Covers:
 * - Raw token generation with sast_p_ prefix
 * - Bcrypt hashing before database storage
 * - Truncated prefix extraction for UI identification
 * - Permission and expiry passthrough to insert
 * - Default permissions when none provided
 */
describe('projectApiTokenRepository.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that creating a token generates a bcrypt hash from the raw token,
   * stores only the hash, and returns the raw token exactly once to the caller.
   * This is the core security guarantee — the raw token is never persisted.
   */
  it('should return the created token record and the raw token value', async () => {
    setDbResult([mockValue({
      id: 'token-1',
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'CI Token',
      tokenHash: '$2a$10$hashedtokenvalue',
      tokenPrefix: 'sast_p_abcde...',
      permissions: ['scans:upload'],
      lastUsedAt: null,
      createdAt: new Date('2026-01-01'),
      expiresAt: null,
      revokedAt: null,
      revokedBy: null,
    })]);

    const result = await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'CI Token',
    });

    expect(result.token).toBeDefined();
    expect(result.token.id).toBe('token-1');
    expect(result.token.name).toBe('CI Token');
    expect(result.rawToken).toBeDefined();
    expect(typeof result.rawToken).toBe('string');
    expect(result.rawToken.length).toBeGreaterThan(0);
  });

  /**
   * Purpose: Ensure the raw token is prefixed with 'sast_p_' for identification
   * and uses cryptographically secure random bytes (32 bytes → 43 base64url chars).
   */
  it('should generate a raw token with the sast_p_ prefix', async () => {
    setDbResult([mockValue({
      id: 'token-1', projectId: 'proj-1', createdBy: 'user-1', name: 'CI Token',
      tokenHash: '$2a$10$h', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'],
      lastUsedAt: null, createdAt: new Date(), expiresAt: null, revokedAt: null, revokedBy: null,
    })]);

    const result = await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'CI Token',
    });

    expect(result.rawToken).toMatch(/^sast_p_/);
  });

  /**
   * Purpose: Verify that the token hash is computed via bcrypt before storage.
   * The repository must never store the raw token in the database.
   */
  it('should hash the raw token with bcrypt before inserting', async () => {
    setDbResult([mockValue({
      id: 'token-1', projectId: 'proj-1', createdBy: 'user-1', name: 'CI Token',
      tokenHash: '$2a$10$h', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'],
      lastUsedAt: null, createdAt: new Date(), expiresAt: null, revokedAt: null, revokedBy: null,
    })]);

    await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'CI Token',
    });

    expect(mockHash).toHaveBeenCalledWith(
      expect.stringMatching(/^sast_p_/),
      10
    );
  });

  /**
   * Purpose: Ensure the tokenPrefix is extracted from the raw token for UI display
   * (first 12 characters + "...") so users can identify tokens without seeing the full value.
   */
  it('should store a truncated prefix for user identification', async () => {
    setDbResult([mockValue({
      id: 'token-1', projectId: 'proj-1', createdBy: 'user-1', name: 'CI Token',
      tokenHash: '$2a$10$h', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'],
      lastUsedAt: null, createdAt: new Date(), expiresAt: null, revokedAt: null, revokedBy: null,
    })]);

    await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'CI Token',
    });

    expect(dbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenPrefix: expect.stringMatching(/^sast_p_.{0,12}\.\.\.$/),
      })
    );
  });

  /**
   * Purpose: Verify that custom permissions and expiry are passed through to the database.
   */
  it('should pass custom permissions and expiry to the insert', async () => {
    setDbResult([mockValue({
      id: 'token-1', projectId: 'proj-1', createdBy: 'user-1', name: 'Restricted Token',
      tokenHash: '$2a$10$h', tokenPrefix: 'sast_p_abc...', permissions: ['scans:read'],
      lastUsedAt: null, createdAt: new Date(), expiresAt: new Date('2027-01-01'), revokedAt: null, revokedBy: null,
    })]);

    const expiresAt = new Date('2027-01-01');
    await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'Restricted Token',
      permissions: ['scans:read'],
      expiresAt,
    });

    expect(dbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ['scans:read'],
        expiresAt,
      })
    );
  });

  /**
   * Purpose: Ensure the default permissions are ['scans:upload'] when none specified,
   * matching the narrow-by-design security principle for CI tokens.
   */
  it('should default permissions to ["scans:upload"] when not provided', async () => {
    setDbResult([mockValue({
      id: 'token-1', projectId: 'proj-1', createdBy: 'user-1', name: 'Default Token',
      tokenHash: '$2a$10$h', tokenPrefix: 'sast_p_abc...', permissions: ['scans:upload'],
      lastUsedAt: null, createdAt: new Date(), expiresAt: null, revokedAt: null, revokedBy: null,
    })]);

    await projectApiTokenRepository.create({
      projectId: 'proj-1',
      createdBy: 'user-1',
      name: 'Default Token',
    });

    expect(dbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ['scans:upload'],
      })
    );
  });
});

/**
 * Unit tests for projectApiTokenRepository.findValidForProject
 *
 * Covers:
 * - Bcrypt hash comparison against stored candidates
 * - Expired token skip (even when hash matches)
 * - Revoked token exclusion from candidate list
 * - Null return for empty project token set
 */
describe('projectApiTokenRepository.findValidForProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that a valid, non-expired, non-revoked token is found
   * by comparing the raw token against stored bcrypt hashes.
   */
  it('should return the token when raw token matches a valid candidate', async () => {
    setDbResult([mockValue({
      id: 'token-1',
      projectId: 'proj-1',
      tokenHash: '$2a$10$hashedtokenvalue',
      expiresAt: null,
      revokedAt: null,
    })]);

    const result = await projectApiTokenRepository.findValidForProject('proj-1', 'sast_p_test123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('token-1');
    expect(mockCompare).toHaveBeenCalledWith('sast_p_test123', '$2a$10$hashedtokenvalue');
  });

  /**
   * Purpose: Ensure expired tokens are skipped even if the hash matches.
   * This prevents reuse of tokens past their configured lifetime.
   */
  it('should skip expired tokens even if hash matches', async () => {
    const pastDate = new Date('2020-01-01');
    setDbResult([
      mockValue({ id: 'expired', projectId: 'proj-1', tokenHash: 'hash1', expiresAt: pastDate, revokedAt: null }),
    ]);
    mockCompare.mockResolvedValueOnce(true);

    const result = await projectApiTokenRepository.findValidForProject('proj-1', 'sast_p_expired');

    expect(result).toBeNull();
  });

  /**
   * Purpose: Verify that revoked tokens are excluded from the lookup query itself.
   * The WHERE clause filters out revokedAt IS NOT NULL.
   */
  it('should not include revoked tokens in the candidate list', async () => {
    setDbResult([]);

    const result = await projectApiTokenRepository.findValidForProject('proj-1', 'sast_p_revoked');

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Return null when no candidates exist for the project (empty token set).
   */
  it('should return null when project has no tokens', async () => {
    setDbResult([]);

    const result = await projectApiTokenRepository.findValidForProject('proj-1', 'sast_p_nothing');

    expect(result).toBeNull();
  });
});

/**
 * Unit tests for projectApiTokenRepository.findAnyValidProjectToken
 *
 * Covers:
 * - Fast-path rejection for non sast_p_ prefixed tokens
 * - 150-candidate limit for global scan performance
 * - Expired candidate skip in global scan
 */
describe('projectApiTokenRepository.findAnyValidProjectToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify the global lookup correctly rejects non-project tokens
   * (tokens not starting with 'sast_p_') before hitting the database.
   * This is a fast-path optimization for the generic authenticate() function.
   */
  it('should return null immediately for tokens not starting with sast_p_', async () => {
    const result = await projectApiTokenRepository.findAnyValidProjectToken('not_a_project_token');

    expect(result).toBeNull();
    expect(dbChain.where).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Ensure the global lookup is bounded to 150 candidates max
   * to prevent performance issues with large token tables.
   */
  it('should limit candidate scan to 150 tokens', async () => {
    setDbResult([]);

    await projectApiTokenRepository.findAnyValidProjectToken('sast_p_test');

    expect(dbChain.limit).toHaveBeenCalledWith(150);
  });

  /**
   * Purpose: Verify that expired tokens are skipped in the global scan.
   */
  it('should skip expired candidates in global scan', async () => {
    const pastDate = new Date('2020-01-01');
    setDbResult([
      mockValue({ id: 't1', tokenHash: 'h1', expiresAt: pastDate, revokedAt: null }),
    ]);

    const result = await projectApiTokenRepository.findAnyValidProjectToken('sast_p_test');

    expect(result).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });
});

/**
 * Unit tests for projectApiTokenRepository.revoke
 *
 * Covers:
 * - Soft delete with revokedAt and revokedBy fields
 * - Null return for non-existent token ID
 */
describe('projectApiTokenRepository.revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that revoking a token sets revokedAt and revokedBy,
   * performing a soft delete rather than hard deletion for audit trail preservation.
   */
  it('should set revokedAt and revokedBy on the token', async () => {
    setDbResult([mockValue({ id: 'token-1', revokedAt: new Date() })]);

    const result = await projectApiTokenRepository.revoke('token-1', 'user-1');

    expect(result).toBeDefined();
    expect(dbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        revokedBy: 'user-1',
      })
    );
    expect(dbChain.where).toHaveBeenCalled();
  });

  /**
   * Purpose: Return null when revoking a non-existent token ID,
   * allowing the caller to handle the "not found" case gracefully.
   */
  it('should return null when token ID does not exist', async () => {
    setDbResult([]);

    const result = await projectApiTokenRepository.revoke('nonexistent', 'user-1');

    expect(result).toBeNull();
  });
});

/**
 * Unit tests for projectApiTokenRepository.listByProject
 *
 * Covers:
 * - Returns all tokens (active + revoked) ordered by createdAt
 */
describe('projectApiTokenRepository.listByProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that listing tokens returns all tokens (active + revoked)
   * for management UI display, ordered by creation date.
   */
  it('should return all tokens for a project ordered by createdAt', async () => {
    setDbResult([
      { id: 't1', name: 'Token 1', revokedAt: null },
      { id: 't2', name: 'Token 2', revokedAt: new Date() },
    ]);

    const result = await projectApiTokenRepository.listByProject('proj-1');

    expect(result).toHaveLength(2);
    expect(dbChain.orderBy).toHaveBeenCalled();
  });
});

/**
 * Unit tests for projectApiTokenRepository.touchLastUsed
 *
 * Covers:
 * - Updates lastUsedAt timestamp (fire-and-forget)
 */
describe('projectApiTokenRepository.touchLastUsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that touchLastUsed updates the last_used_at timestamp.
   * This is fire-and-forget (best effort) — errors should not propagate.
   */
  it('should update lastUsedAt for the token', async () => {
    await projectApiTokenRepository.touchLastUsed('token-1');

    expect(dbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        lastUsedAt: expect.any(Date),
      })
    );
  });
});

/**
 * Unit tests for projectApiTokenRepository.findById
 *
 * Covers:
 * - Returns token record when found
 * - Returns null for non-existent ID
 */
describe('projectApiTokenRepository.findById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that findById returns a single token record when found.
   */
  it('should return the token when it exists', async () => {
    setDbResult([{ id: 'token-1', name: 'CI Token' }]);

    const result = await projectApiTokenRepository.findById('token-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('token-1');
  });

  /**
   * Purpose: Return null for non-existent token IDs, enabling clean "not found" handling.
   */
  it('should return null when token does not exist', async () => {
    setDbResult([]);

    const result = await projectApiTokenRepository.findById('nonexistent');

    expect(result).toBeNull();
  });
});
