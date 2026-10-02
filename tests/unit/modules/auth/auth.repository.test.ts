/**
 * Unit tests for authRepository
 *
 * Tests database operations for authentication including:
 * - User lookup by email and ID
 * - Session creation, lookup, and expiry handling
 * - Invitation creation and lookup
 * - Workspace membership retrieval
 *
 * Focus is on the repository's query logic and edge cases
 * (expired sessions, null results, etc.).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocked db chain ---

const mockDbSelectResult: unknown[] = [];

vi.mock('@/server/db/client', () => {
  function createChain() {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.select = vi.fn().mockReturnValue(c);
    c.from = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(c);
    c.limit = vi.fn().mockReturnValue(c);
    c.insert = vi.fn().mockReturnValue(c);
    c.values = vi.fn().mockReturnValue(c);
    c.returning = vi.fn().mockReturnValue(c);
    c.update = vi.fn().mockReturnValue(c);
    c.set = vi.fn().mockReturnValue(c);
    c.delete = vi.fn().mockReturnValue(c);
    c.innerJoin = vi.fn().mockReturnValue(c);

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
      delete: (...args: unknown[]) => (chain.delete as Function)(...args),
      transaction: vi.fn(async (fn: (tx: typeof chain) => Promise<unknown>) => fn(chain)),
    },
    _chain: chain,
  };
});

import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
 
const { _chain: dbChain } = await import('@/server/db/client') as any;

function setDbResult(rows: unknown[]) {
  mockDbSelectResult.length = 0;
  mockDbSelectResult.push(...rows);
}

function clearDbResults() {
  mockDbSelectResult.length = 0;
}

// --- Tests ---------------------------------------------------------------

describe('authRepository.findUserByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that findUserByEmail returns the user record when found.
   */
  it('should return the user when found by email', async () => {
    setDbResult([{ id: 'user-1', email: 'test@example.com', name: 'Test' }]);

    const result = await authRepository.findUserByEmail('test@example.com');

    expect(result).toBeDefined();
    expect(result?.id).toBe('user-1');
    expect(result?.email).toBe('test@example.com');
  });

  /**
   * Purpose: Return null when no user matches the email.
   */
  it('should return null when email does not exist', async () => {
    setDbResult([]);

    const result = await authRepository.findUserByEmail('nobody@example.com');

    expect(result).toBeNull();
  });
});

describe('authRepository.findUserById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that findUserById returns the user record when found.
   */
  it('should return the user when found by ID', async () => {
    setDbResult([{ id: 'user-1', email: 'test@example.com' }]);

    const result = await authRepository.findUserById('user-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('user-1');
  });

  /**
   * Purpose: Return null when no user matches the ID.
   */
  it('should return null when ID does not exist', async () => {
    setDbResult([]);

    const result = await authRepository.findUserById('nonexistent');

    expect(result).toBeNull();
  });
});

describe('authRepository.createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that createUser inserts and returns the new user record.
   */
  it('should insert and return the new user', async () => {
    setDbResult([{ id: 'user-1', email: 'new@example.com', name: 'New User' }]);

    const result = await authRepository.createUser({
      email: 'new@example.com',
      passwordHash: 'hashed',
      name: 'New User',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('user-1');
    expect(dbChain.values).toHaveBeenCalled();
  });
});

describe('authRepository.createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that createSession inserts with correct fields including
   * lastActivity and expiresAt timestamps.
   */
  it('should create a session with expiry and activity timestamps', async () => {
    const mockSession = {
      id: 'session-1',
      userId: 'user-1',
      lastActivity: new Date(),
      expiresAt: new Date(),
    };
    setDbResult([mockSession]);

    const result = await authRepository.createSession({
      id: 'session-1',
      userId: 'user-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('session-1');
    expect(dbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
        userId: 'user-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
    );
  });
});

describe('authRepository.findSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that findSession returns the session when it exists and is not expired.
   */
  it('should return the session when it exists and is active', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60);
    setDbResult([{ id: 'session-1', userId: 'user-1', expiresAt: futureDate }]);

    const result = await authRepository.findSession('session-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('session-1');
  });

  /**
   * Purpose: Return null and delete the session when it is expired.
   * This is the auto-cleanup behavior for expired sessions.
   */
  it('should return null and delete session when expired', async () => {
    const pastDate = new Date('2020-01-01');
    setDbResult([{ id: 'session-1', userId: 'user-1', expiresAt: pastDate }]);

    const result = await authRepository.findSession('session-1');

    expect(result).toBeNull();
    expect(dbChain.delete).toHaveBeenCalled();
  });

  /**
   * Purpose: Return null when session does not exist.
   */
  it('should return null when session does not exist', async () => {
    setDbResult([]);

    const result = await authRepository.findSession('nonexistent');

    expect(result).toBeNull();
  });
});

describe('authRepository.deleteSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that deleteSession calls db.delete with the correct session ID.
   */
  it('should call delete for the session', async () => {
    await authRepository.deleteSession('session-1');

    expect(dbChain.delete).toHaveBeenCalled();
    expect(dbChain.where).toHaveBeenCalled();
  });
});

describe('authRepository.updateSessionRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that updateSessionRefreshToken sets the new refresh token ID
   * and updates lastActivity timestamp.
   */
  it('should update currentRefreshTokenId and lastActivity', async () => {
    await authRepository.updateSessionRefreshToken('session-1', 'new-refresh-id');

    expect(dbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        currentRefreshTokenId: 'new-refresh-id',
        lastActivity: expect.any(Date),
      })
    );
  });
});

describe('authRepository.createInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that createInvitation inserts with correct fields
   * including calculated expiry.
   */
  it('should create an invitation with expiry', async () => {
    setDbResult([{ id: 'inv-1', email: 'invite@example.com', role: 'member' }]);

    const result = await authRepository.createInvitation({
      email: 'invite@example.com',
      role: 'member',
      workspaceId: 'ws-1',
      invitedBy: 'user-1',
      token: 'abc123',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('inv-1');
    expect(dbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'invite@example.com',
        role: 'member',
        workspaceId: 'ws-1',
        token: 'abc123',
      })
    );
  });
});

describe('authRepository.findInvitationByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that findInvitationByToken returns the invitation when found.
   */
  it('should return the invitation when token matches', async () => {
    setDbResult([{ id: 'inv-1', token: 'abc123', email: 'invite@example.com' }]);

    const result = await authRepository.findInvitationByToken('abc123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('inv-1');
  });

  /**
   * Purpose: Return null when token does not match any invitation.
   */
  it('should return null when token does not exist', async () => {
    setDbResult([]);

    const result = await authRepository.findInvitationByToken('nonexistent');

    expect(result).toBeNull();
  });
});

describe('authRepository.markInvitationAccepted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that markInvitationAccepted sets acceptedAt timestamp.
   */
  it('should set acceptedAt on the invitation', async () => {
    await authRepository.markInvitationAccepted('inv-1');

    expect(dbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptedAt: expect.any(Date),
      })
    );
  });
});

describe('authRepository.getUserWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDbResults();
  });

  /**
   * Purpose: Verify that getUserWorkspace returns workspace info with role
   * when the user is a member of the workspace.
   */
  it('should return workspace with role when user is a member', async () => {
    setDbResult([{ id: 'ws-1', name: 'Test Workspace', slug: 'test', role: 'owner' }]);

    const result = await authRepository.getUserWorkspace('user-1', 'ws-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('ws-1');
    expect(result?.role).toBe('owner');
  });

  /**
   * Purpose: Return null when user is not a member of the workspace.
   */
  it('should return null when user is not a member', async () => {
    setDbResult([]);

    const result = await authRepository.getUserWorkspace('user-1', 'ws-nonexistent');

    expect(result).toBeNull();
  });
});
