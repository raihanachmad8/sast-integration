/**
 * Unit tests for authFlowsService
 *
 * This service handles side effects related to authentication flows:
 * - Password reset (forgot + reset)
 * - Email verification sending
 * - Invitation email sending
 *
 * These tests focus on email sending logic, rate limiting, and token generation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

const mailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findRecentPasswordResetToken: vi.fn(),
  createPasswordResetToken: vi.fn(),
  findPasswordResetToken: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  updateUserPassword: vi.fn(),
  findRecentEmailVerificationToken: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  findEmailVerificationToken: vi.fn(),
  completeEmailVerification: vi.fn(),
}));

vi.mock('@/server/db/client', () => ({
  db: dbMocks,
}));

vi.mock('@drizzle/schema', () => ({
  users: {},
  sessions: {},
  passwordResetTokens: {},
  emailVerificationTokens: {},
}));

vi.mock('@/server/modules/mail/mail.service', () => ({
  sendMail: mailMocks.sendMail,
}));

vi.mock('@/server/modules/auth/repositories/auth-flows.repository', () => ({
  authFlowsRepository: repoMocks,
}));

vi.mock('@/server/env', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
  },
}));

import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { MAIL } from '@/server/modules/mail/constants';

function selectRows(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function insertValues() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

/**
 * Unit tests for authFlowsService.forgotPassword
 *
 * Tests the password reset request flow, including:
 * - Sending reset emails to known users
 * - Silent failure for unknown emails (security)
 * - Rate limiting protection
 */
describe('authFlowsService.forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
  });

  /**
   * Purpose: Validates that a password reset email is sent with a valid token link
   */
  it('should send a password reset email containing a valid token to a known user', async () => {
    repoMocks.findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'admin@sast.local', name: 'Admin' });
    repoMocks.findRecentPasswordResetToken.mockResolvedValue(null);

    await authFlowsService.forgotPassword('admin@sast.local');

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@sast.local',
        html: expect.stringContaining('/auth/reset-password?token='),
      }),
    );
  });

  /**
   * Purpose: Validates silent failure for unknown emails to prevent user enumeration
   */
  it('should not send any email and return silently when the email is not registered', async () => {
    repoMocks.findUserByEmail.mockResolvedValue(null);

    await authFlowsService.forgotPassword('unknown@test.com');

    expect(mailMocks.sendMail).not.toHaveBeenCalled();
  });

  /**
   * Purpose: Validates that rate limiting prevents repeated password reset requests
   */
  it('should throw a rate limit error when a recent reset token already exists for the user', async () => {
    repoMocks.findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'admin@sast.local', name: 'Admin' });
    repoMocks.findRecentPasswordResetToken.mockResolvedValue({ id: 'recent-token' });

    await expect(authFlowsService.forgotPassword('admin@sast.local')).rejects.toThrow(MAIL.MESSAGES.RATE_LIMITED);
  });
});

/**
 * Unit tests for authFlowsService.resetPassword
 *
 * Validates token validity rules (expired, already used, non-existent).
 */
describe('authFlowsService.resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Validates that expired reset tokens are rejected
   */
  it('should throw TOKEN_EXPIRED when the reset token has expired', async () => {
    repoMocks.findPasswordResetToken.mockResolvedValue({ id: 't-1', userId: 'u-1', expiresAt: new Date(0), usedAt: null });

    await expect(authFlowsService.resetPassword('token', 'newpass123')).rejects.toThrow(MAIL.MESSAGES.TOKEN_EXPIRED);
  });

  /**
   * Purpose: Validates that already-used reset tokens are rejected
   */
  it('should throw TOKEN_ALREADY_USED when the reset token has already been used', async () => {
    repoMocks.findPasswordResetToken.mockResolvedValue({ id: 't-1', userId: 'u-1', expiresAt: new Date(Date.now() + 60000), usedAt: new Date() });

    await expect(authFlowsService.resetPassword('token', 'newpass123')).rejects.toThrow(MAIL.MESSAGES.TOKEN_ALREADY_USED);
  });

  it('should throw TOKEN_EXPIRED when the reset token does not exist (treated as expired for security)', async () => {
    repoMocks.findPasswordResetToken.mockResolvedValue(null);

    await expect(authFlowsService.resetPassword('invalid', 'newpass123')).rejects.toThrow(MAIL.MESSAGES.TOKEN_EXPIRED);
  });
});

/**
 * Unit tests for authFlowsService.verifyEmail
 *
 * Validates email verification token rules.
 */
describe('authFlowsService.verifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Validates that expired verification tokens are rejected
   */
  it('should throw TOKEN_EXPIRED when the verification token has expired', async () => {
    repoMocks.findEmailVerificationToken.mockResolvedValue({ id: 't-1', userId: 'u-1', expiresAt: new Date(0), verifiedAt: null });

    await expect(authFlowsService.verifyEmail('token')).rejects.toThrow(MAIL.MESSAGES.TOKEN_EXPIRED);
  });

  /**
   * Purpose: Validates that already-used verification tokens are rejected
   */
  it('should throw TOKEN_ALREADY_USED when the verification token has already been used', async () => {
    repoMocks.findEmailVerificationToken.mockResolvedValue({ id: 't-1', userId: 'u-1', expiresAt: new Date(Date.now() + 60000), verifiedAt: new Date() });

    await expect(authFlowsService.verifyEmail('token')).rejects.toThrow(MAIL.MESSAGES.TOKEN_ALREADY_USED);
  });
});

/**
 * Unit tests for authFlowsService.sendVerificationEmail
 *
 * Tests sending of email verification links after registration or invitation.
 */
describe('authFlowsService.sendVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
  });

  /**
   * Purpose: Validates that a verification email is sent to unverified users
   */
  it('should send a verification email to an unverified user', async () => {
    repoMocks.findUserById.mockResolvedValue({ id: 'user-1', email: 'new@test.com', name: 'New', emailVerifiedAt: null });
    repoMocks.findRecentEmailVerificationToken.mockResolvedValue(null);

    await authFlowsService.sendVerificationEmail('user-1');

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@test.com',
        html: expect.stringContaining('/auth/verify-email?token='),
      }),
    );
  });

  /**
   * Purpose: Validates that sending verification to a verified user throws an error
   */
  it('should throw EMAIL_ALREADY_VERIFIED when trying to send verification to an already verified user', async () => {
    repoMocks.findUserById.mockResolvedValue({ id: 'user-1', email: 'v@test.com', name: 'V', emailVerifiedAt: new Date() });

    await expect(authFlowsService.sendVerificationEmail('user-1')).rejects.toThrow(MAIL.MESSAGES.EMAIL_ALREADY_VERIFIED);
  });

  /**
   * Purpose: Validates that rate limiting prevents repeated verification email requests
   */
  it('should throw RATE_LIMITED when a recent verification token already exists for the user', async () => {
    repoMocks.findUserById.mockResolvedValue({ id: 'user-1', email: 'new@test.com', name: 'New', emailVerifiedAt: null });
    repoMocks.findRecentEmailVerificationToken.mockResolvedValue({ id: 'recent' });

    await expect(authFlowsService.sendVerificationEmail('user-1')).rejects.toThrow(MAIL.MESSAGES.RATE_LIMITED);
  });
});
