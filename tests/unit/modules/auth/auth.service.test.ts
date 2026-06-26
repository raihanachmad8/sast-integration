/**
 * Unit tests for authService (Authentication Service)
 *
 * This file contains tests for core authentication logic:
 * - Sign in / Sign out
 * - User registration (signup)
 * - Session management
 *
 * Focus is on business rules, error handling, and integration between
 * repository and flows service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/server/modules/auth/services/auth.service';
import { AUTH } from '@/server/modules/auth/constants';

// Mock dependencies
vi.mock('@/server/modules/auth/repositories/auth.repository', () => ({
  authRepository: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    createSession: vi.fn(),
    findSession: vi.fn(),
    deleteSession: vi.fn(),
    createInvitation: vi.fn(),
    findInvitationByToken: vi.fn(),
    markInvitationAccepted: vi.fn(),
    getUserWorkspace: vi.fn(),
    updateSessionRefreshToken: vi.fn(),
  },
}));

vi.mock('@/server/modules/auth/services/auth-flows.service', () => ({
  authFlowsService: {
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock('@/server/db/client', () => ({
  db: {
    transaction: vi.fn((fn) => fn({
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
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    })),
  },
}));

vi.mock('@drizzle/schema', () => ({
  users: {},
  workspaceMembers: {},
}));

vi.mock('@/server/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-minimum-32-chars!!',
    JWT_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '7d',
    WORKSPACE_MODE: 'multiple',
  },
}));

vi.mock('@/server/modules/mail/mail.service', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/modules/mail/constants', () => ({
  MAIL: { SUBJECTS: { WORKSPACE_INVITE: 'Workspace Invitation' } },
}));

vi.mock('@/server/modules/mail/templates', () => ({
  workspaceInviteTemplate: vi.fn().mockReturnValue('<html>invite</html>'),
}));

vi.mock('@/server/http/constants', () => ({
  JWT_ALGORITHM: 'HS256',
  TOKEN_BYTES: 32,
  TOKEN_PAYLOAD: {},
}));

vi.mock('@/commons/constants/permissions', () => ({
  ROLE_PERMISSIONS: { owner: ['*'], manager: [], reviewer: [], member: [] },
}));

import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { sendMail } from '@/server/modules/mail/mail.service';

const mockRepo = vi.mocked(authRepository);
const mockFlows = vi.mocked(authFlowsService);

/**
 * Unit tests for authService.signin
 *
 * Covers:
 * - Successful authentication and token generation
 * - Session creation with optional metadata (IP, User Agent)
 * - Error handling for invalid credentials
 */
describe('authService.signin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Validates that valid credentials return tokens and user data
   */
  it('should return access token, refresh token, and user data when credentials are valid', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: await (await import('bcryptjs')).hash('password123', 12),
      avatarUrl: null,
      twoFactorSecret: null,
      twoFactorConfirmedAt: null,
      emailVerifiedAt: new Date(),
      currentWorkspaceId: null,
      rememberToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
    });
    mockRepo.createSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      ipAddress: null,
      userAgent: null,
      lastActivity: new Date(),
      createdAt: new Date(),
    });

    const result = await authService.signin({ email: 'test@example.com', password: 'password123' });

    expect(result.tokenType).toBe('Bearer');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresAt).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.emailVerified).toBe(true);
  });

  /**
   * Purpose: Validates that nonexistent email returns INVALID_CREDENTIALS error
   */
  it('should throw INVALID_CREDENTIALS when the email does not exist', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      authService.signin({ email: 'nobody@example.com', password: 'password123' })
    ).rejects.toThrow(AUTH.ERRORS.INVALID_CREDENTIALS);
  });

  /**
   * Purpose: Validates that wrong password returns INVALID_CREDENTIALS error
   */
  it('should throw INVALID_CREDENTIALS when the password is incorrect', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: await (await import('bcryptjs')).hash('correct-password', 12),
      avatarUrl: null,
      twoFactorSecret: null,
      twoFactorConfirmedAt: null,
      emailVerifiedAt: null,
      currentWorkspaceId: null,
      rememberToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
    });

    await expect(
      authService.signin({ email: 'test@example.com', password: 'wrong-password' })
    ).rejects.toThrow(AUTH.ERRORS.INVALID_CREDENTIALS);
  });

  /**
   * Purpose: Validates that IP and User Agent metadata are saved to the session
   */
  it('should pass IP address and User Agent to session creation when provided during signin', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: await (await import('bcryptjs')).hash('password123', 12),
      avatarUrl: null,
      twoFactorSecret: null,
      twoFactorConfirmedAt: null,
      emailVerifiedAt: null,
      currentWorkspaceId: null,
      rememberToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
    });
    mockRepo.createSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      lastActivity: new Date(),
      createdAt: new Date(),
    });

    await authService.signin(
      { email: 'test@example.com', password: 'password123' },
      { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
    );

    expect(mockRepo.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' })
    );
  });
});

/**
 * Unit tests for authService.signup
 *
 * Covers:
 * - Blocking registration in SINGLE workspace mode
 * - Preventing duplicate email registration
 * - Automatic personal workspace creation in MULTIPLE mode
 * - Triggering verification email after successful signup
 */
describe('authService.signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Validates that signup is blocked in single workspace mode
   */
  it('should throw REGISTRATION_DISABLED when WORKSPACE_MODE is single', async () => {
    const { env } = await import('@/server/env');
    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'single';

    await expect(
      authService.signup({ email: 'new@example.com', password: 'password123', name: 'New User' })
    ).rejects.toThrow(AUTH.ERRORS.REGISTRATION_DISABLED);

    (env as { WORKSPACE_MODE: string }).WORKSPACE_MODE = 'multiple';
  });

  /**
   * Purpose: When email already exists, signup should throw 409 EMAIL_EXISTS.
   * This prevents user enumeration — attacker gets same error for existing/new emails.
   */
  it('should throw EMAIL_EXISTS when email already exists', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({ id: 'existing', email: 'existing@example.com', name: 'Existing User' } as never);

    await expect(
      authService.signup({
        email: 'existing@example.com',
        password: 'password123',
        name: 'User',
      })
    ).rejects.toThrow(AUTH.ERRORS.EMAIL_EXISTS);
  });

  /**
   * Purpose: Validates that a verification email is sent after successful registration
   */
  it('should call sendVerificationEmail after successfully creating a new user in MULTIPLE mode', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    mockRepo.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      name: 'New User',
      passwordHash: 'hash',
      avatarUrl: null,
      twoFactorSecret: null,
      twoFactorConfirmedAt: null,
      emailVerifiedAt: null,
      currentWorkspaceId: null,
      rememberToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
    });
    mockFlows.sendVerificationEmail.mockResolvedValue(undefined);

    const result = await authService.signup({ email: 'new@example.com', password: 'password123', name: 'New User' });

    expect(result.id).toBe('user-1');
    expect(mockFlows.sendVerificationEmail).toHaveBeenCalledWith('user-1');
  });
});

/**
 * Unit tests for authService.signout
 *
 * Currently only tests basic session deletion.
 * More complex scenarios (invalid session, etc.) can be added later.
 */
describe('authService.signout', () => {
  /**
   * Purpose: Validates that signout deletes the correct session
   */
  it('should call deleteSession with the correct session ID', async () => {
    mockRepo.deleteSession.mockResolvedValue(undefined);

    await authService.signout('session-123');

    expect(mockRepo.deleteSession).toHaveBeenCalledWith('session-123');
  });
});

/**
 * Unit tests for authService.refresh (with rotation + reuse detection)
 */
describe('authService.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Validates that refresh token rotation generates a new token ID
   */
  it('should rotate refresh token and update currentRefreshTokenId on successful refresh', async () => {
    const sessionId = 'session-123';
    const oldRefreshTokenId = 'old-refresh-id';
    const newRefreshTokenId = 'new-refresh-id-456';

    mockRepo.findSession.mockResolvedValue({
      id: sessionId,
      userId: 'user-1',
      currentRefreshTokenId: oldRefreshTokenId,
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    mockRepo.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as any);

    // Mock the repository to capture the new refresh token id
    mockRepo.updateSessionRefreshToken.mockResolvedValue(undefined);

    const result = await authService.refresh(sessionId, oldRefreshTokenId);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockRepo.updateSessionRefreshToken).toHaveBeenCalledWith(
      sessionId,
      expect.any(String), // new refreshTokenId
    );
    // The new ID should be different from the old one
    const calledWithId = mockRepo.updateSessionRefreshToken.mock.calls[0][1];
    expect(calledWithId).not.toBe(oldRefreshTokenId);
  });

  /**
   * Purpose: Validates that stolen refresh tokens cause session revocation
   */
  it('should revoke the session and throw when refresh token reuse is detected', async () => {
    const sessionId = 'session-123';
    const currentRefreshTokenId = 'current-id-789';
    const oldStolenRefreshTokenId = 'stolen-old-id';

    mockRepo.findSession.mockResolvedValue({
      id: sessionId,
      userId: 'user-1',
      currentRefreshTokenId: currentRefreshTokenId,
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    await expect(
      authService.refresh(sessionId, oldStolenRefreshTokenId)
    ).rejects.toThrow(AUTH.ERRORS.INVALID_SESSION);

    expect(mockRepo.deleteSession).toHaveBeenCalledWith(sessionId);
    expect(mockRepo.updateSessionRefreshToken).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates backward compatibility when currentRefreshTokenId is null
   */
  it('should still work (first rotation after migration) when currentRefreshTokenId is null', async () => {
    const sessionId = 'session-123';

    mockRepo.findSession.mockResolvedValue({
      id: sessionId,
      userId: 'user-1',
      currentRefreshTokenId: null, // legacy session after adding the column
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    mockRepo.findUserById.mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any);
    mockRepo.updateSessionRefreshToken.mockResolvedValue(undefined);

    const result = await authService.refresh(sessionId, 'some-token-id');

    expect(result.refreshToken).toBeDefined();
    expect(mockRepo.updateSessionRefreshToken).toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that each refresh produces a unique token ID
   */
  it('should generate a new refreshTokenId different from the previous one on every refresh', async () => {
    const sessionId = 'session-123';
    const oldId = 'old-id';

    mockRepo.findSession.mockResolvedValue({
      id: sessionId,
      userId: 'user-1',
      currentRefreshTokenId: oldId,
      expiresAt: new Date(Date.now() + 100000),
    } as any);

    mockRepo.findUserById.mockResolvedValue({ id: 'user-1', email: 'test@example.com' } as any);
    mockRepo.updateSessionRefreshToken.mockResolvedValue(undefined);

    await authService.refresh(sessionId, oldId);

    const newId = mockRepo.updateSessionRefreshToken.mock.calls[0][1];
    expect(newId).not.toBe(oldId);
    expect(typeof newId).toBe('string');
    expect(newId.length).toBeGreaterThan(10);
  });
});

describe('authService.invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ positive', () => {
    it('should create invitation and send email for valid request', async () => {
      mockRepo.createInvitation.mockResolvedValue({
        id: 'inv-1', email: 'new@example.com', role: 'member',
        workspaceId: 'ws-1', createdBy: 'user-1', token: 'token-abc',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null, createdAt: new Date(),
      });
      mockRepo.getUserWorkspace.mockResolvedValue({ name: 'My Workspace' });

      const result = await authService.invite(
        { email: 'new@example.com', role: 'member' },
        'ws-1',
        'user-1'
      );

      expect(result.email).toBe('new@example.com');
      expect(result.token).toBeDefined();
      expect(mockRepo.createInvitation).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        role: 'member',
        workspaceId: 'ws-1',
        invitedBy: 'user-1',
      }));
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'new@example.com',
      }));
    });
  });

  describe('❌ negative', () => {
    it('should propagate email service errors', async () => {
      mockRepo.createInvitation.mockResolvedValue({
        id: 'inv-1', email: 'new@example.com', role: 'member',
        workspaceId: 'ws-1', createdBy: 'user-1', token: 'token-abc',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null, createdAt: new Date(),
      });
      mockRepo.getUserWorkspace.mockResolvedValue({ name: 'My Workspace' });
      vi.mocked(sendMail).mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(
        authService.invite({ email: 'new@example.com', role: 'member' }, 'ws-1', 'user-1')
      ).rejects.toThrow('SMTP connection failed');
    });
  });
});

describe('authService.acceptInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ positive', () => {
    it('should create user and add to workspace for valid token', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'new@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      mockRepo.findUserByEmail.mockResolvedValue(null);
      mockRepo.createUser.mockResolvedValue({
        id: 'user-new', email: 'new@example.com', name: 'New User',
      } as any);
      mockRepo.markInvitationAccepted.mockResolvedValue(undefined);

      const result = await authService.acceptInvite({
        token: 'valid-token', password: 'Password123!', name: 'New User',
      });

      expect(result.id).toBe('user-new');
      expect(result.email).toBe('new@example.com');
      expect(mockRepo.createUser).toHaveBeenCalled();
      expect(mockRepo.markInvitationAccepted).toHaveBeenCalledWith('inv-1', expect.anything());
    });

    it('should use existing user if email already exists', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'existing@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      mockRepo.findUserByEmail.mockResolvedValue({
        id: 'user-existing', email: 'existing@example.com',
      } as any);
      mockRepo.markInvitationAccepted.mockResolvedValue(undefined);

      const result = await authService.acceptInvite({
        token: 'valid-token', password: 'Password123!', name: 'Existing User',
      });

      expect(result.id).toBe('user-existing');
      expect(mockRepo.createUser).not.toHaveBeenCalled();
    });
  });

  describe('❌ negative', () => {
    it('should throw INVITE_EXPIRED when token is invalid', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue(null);

      await expect(
        authService.acceptInvite({ token: 'bad-token', password: 'Password123!', name: 'User' })
      ).rejects.toThrow(AUTH.ERRORS.INVITE_EXPIRED);
    });

    it('should throw INVITE_EXPIRED when invitation is expired', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'new@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'expired-token',
        expiresAt: new Date(Date.now() - 86400000), acceptedAt: null,
      });

      await expect(
        authService.acceptInvite({ token: 'expired-token', password: 'Password123!', name: 'User' })
      ).rejects.toThrow(AUTH.ERRORS.INVITE_EXPIRED);
    });

    it('should throw INVITE_ALREADY_ACCEPTED when already accepted', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'new@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'accepted-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: new Date(),
      });

      await expect(
        authService.acceptInvite({ token: 'accepted-token', password: 'Password123!', name: 'User' })
      ).rejects.toThrow(AUTH.ERRORS.INVITE_ALREADY_ACCEPTED);
    });
  });
});

describe('authService.acceptInviteForLoggedInUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('✅ positive', () => {
    it('should add existing user to workspace via invitation', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'user@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      mockRepo.findUserById.mockResolvedValue({
        id: 'user-1', email: 'user@example.com',
      } as any);
      mockRepo.markInvitationAccepted.mockResolvedValue(undefined);

      const result = await authService.acceptInviteForLoggedInUser('valid-token', 'user-1');

      expect(result.workspaceId).toBe('ws-1');
      expect(result.role).toBe('member');
      expect(mockRepo.markInvitationAccepted).toHaveBeenCalled();
    });
  });

  describe('❌ negative', () => {
    it('should throw INVITE_EXPIRED when token is invalid', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue(null);

      await expect(
        authService.acceptInviteForLoggedInUser('bad-token', 'user-1')
      ).rejects.toThrow(AUTH.ERRORS.INVITE_EXPIRED);
    });

    it('should throw INVITE_EXPIRED when invitation is expired', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'user@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'expired-token',
        expiresAt: new Date(Date.now() - 86400000), acceptedAt: null,
      });

      await expect(
        authService.acceptInviteForLoggedInUser('expired-token', 'user-1')
      ).rejects.toThrow(AUTH.ERRORS.INVITE_EXPIRED);
    });

    it('should throw INVITE_ALREADY_ACCEPTED when already accepted', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'user@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'accepted-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: new Date(),
      });

      await expect(
        authService.acceptInviteForLoggedInUser('accepted-token', 'user-1')
      ).rejects.toThrow(AUTH.ERRORS.INVITE_ALREADY_ACCEPTED);
    });

    it('should throw when user email does not match invitation email', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'other@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      mockRepo.findUserById.mockResolvedValue({
        id: 'user-1', email: 'different@example.com',
      } as any);

      await expect(
        authService.acceptInviteForLoggedInUser('valid-token', 'user-1')
      ).rejects.toThrow(/invitation was sent to/);
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockRepo.findInvitationByToken.mockResolvedValue({
        id: 'inv-1', email: 'user@example.com', role: 'member',
        workspaceId: 'ws-1', token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      mockRepo.findUserById.mockResolvedValue(null);

      await expect(
        authService.acceptInviteForLoggedInUser('valid-token', 'ghost-user')
      ).rejects.toThrow(AUTH.ERRORS.USER_NOT_FOUND);
    });
  });
});

