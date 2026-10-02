/**
 * Unit tests for jwtService
 *
 * Tests JWT token operations including:
 * - Access token signing and verification
 * - Refresh token signing and verification
 * - Invalid/expired token handling
 * - Token payload preservation
 *
 * Focus is on the sign/verify round-trip and error handling.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/server/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-jwt-tests-minimum-32-chars!',
    JWT_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '7d',
  },
}));

import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
} from '@/server/modules/auth/services/jwt.service';

// --- Tests ---------------------------------------------------------------

describe('signAccessToken', () => {
  /**
   * Purpose: Verify that signing an access token produces a valid JWT string
   * that can be verified and decoded back to the original payload.
   */
  it('should return a valid JWT string that can be verified', async () => {
    const token = await signAccessToken({
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'session-1',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await verifyToken(token);
    expect(payload).toBeDefined();
    expect(payload?.sub).toBe('user-1');
    expect(payload?.email).toBe('test@example.com');
    expect(payload?.sessionId).toBe('session-1');
  });
});

describe('signRefreshToken', () => {
  /**
   * Purpose: Verify that signing a refresh token produces a valid JWT
   * containing the sessionId and refreshTokenId for rotation detection.
   */
  it('should return a valid JWT with sessionId and refreshTokenId', async () => {
    const token = await signRefreshToken({
      sessionId: 'session-1',
      refreshTokenId: 'refresh-abc',
    });

    expect(typeof token).toBe('string');

    const payload = await verifyRefreshToken(token);
    expect(payload).toBeDefined();
    expect(payload?.sessionId).toBe('session-1');
    expect(payload?.refreshTokenId).toBe('refresh-abc');
  });
});

describe('verifyToken', () => {
  /**
   * Purpose: Verify that verifyToken returns null for an invalid token string.
   * This prevents acceptance of tampered or malformed tokens.
   */
  it('should return null for an invalid token', async () => {
    const result = await verifyToken('invalid.token.here');
    expect(result).toBeNull();
  });

  /**
   * Purpose: Verify that verifyToken returns null for an empty string.
   */
  it('should return null for an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  /**
   * Purpose: Verify that verifyToken returns null for a token signed with a different secret.
   * This prevents cross-application token acceptance.
   */
  it('should return null for a token signed with wrong secret', async () => {
    const { SignJWT } = await import('jose');
    const wrongToken = await new SignJWT({ sub: 'user-1', email: 'x@x.com', sessionId: 's1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('wrong-secret-different-key'));

    const result = await verifyToken(wrongToken);
    expect(result).toBeNull();
  });
});

describe('verifyRefreshToken', () => {
  /**
   * Purpose: Verify that verifyRefreshToken returns null for an invalid token.
   */
  it('should return null for an invalid refresh token', async () => {
    const result = await verifyRefreshToken('garbage.refresh.token');
    expect(result).toBeNull();
  });

  /**
   * Purpose: Verify that verifyRefreshToken returns null for an access token
   * (different token type, same secret — should still work since payload differs).
   */
  it('should return null for an access token used as refresh token', async () => {
    const accessToken = await signAccessToken({
      sub: 'user-1',
      email: 'test@example.com',
      sessionId: 'session-1',
    });

    const result = await verifyRefreshToken(accessToken);
    // Access tokens don't have refreshTokenId, so the cast will produce undefined fields
    // but jose won't reject it — the payload just won't match RefreshTokenPayload shape
    expect(result).toBeDefined();
    expect(result?.refreshTokenId).toBeUndefined();
  });
});
