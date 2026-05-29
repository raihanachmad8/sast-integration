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
  },
}));

vi.mock('@/server/modules/auth/services/auth-flows.service', () => ({
  authFlowsService: {
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock('@/server/db/client', () => ({
  db: { transaction: vi.fn((fn) => fn({ insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'ws-1' }]) }) }) })) },
}));

vi.mock('@/server/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-minimum-32-chars!!',
    JWT_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '7d',
    WORKSPACE_MODE: 'multiple',
    REGISTRATION_MODE: 'open',
  },
}));

import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';

const mockRepo = vi.mocked(authRepository);
const mockFlows = vi.mocked(authFlowsService);

describe('authService.signin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tokens and user on valid credentials', async () => {
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

  it('should throw on non-existent email', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);

    await expect(
      authService.signin({ email: 'nobody@example.com', password: 'password123' })
    ).rejects.toThrow(AUTH.ERRORS.INVALID_CREDENTIALS);
  });

  it('should throw on wrong password', async () => {
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

  it('should include session metadata (ip, userAgent)', async () => {
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

describe('authService.signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when registration mode is invite', async () => {
    const { env } = await import('@/server/env');
    (env as { REGISTRATION_MODE: string }).REGISTRATION_MODE = 'invite';

    await expect(
      authService.signup({ email: 'new@example.com', password: 'password123', name: 'New User' })
    ).rejects.toThrow(AUTH.ERRORS.REGISTRATION_DISABLED);

    (env as { REGISTRATION_MODE: string }).REGISTRATION_MODE = 'open';
  });

  it('should throw when email already exists', async () => {
    mockRepo.findUserByEmail.mockResolvedValue({ id: 'existing' } as never);

    await expect(
      authService.signup({ email: 'existing@example.com', password: 'password123', name: 'User' })
    ).rejects.toThrow(AUTH.ERRORS.EMAIL_EXISTS);
  });

  it('should send a verification email to a newly registered user', async () => {
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

describe('authService.signout', () => {
  it('should delete session', async () => {
    mockRepo.deleteSession.mockResolvedValue(undefined);

    await authService.signout('session-123');

    expect(mockRepo.deleteSession).toHaveBeenCalledWith('session-123');
  });
});
