import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';

async function getAccessToken() {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

/**
 * E2E tests covering various auth-related flows:
 * - Invitation sending and acceptance
 * - Password reset flow
 * - Email verification
 *
 * Many of these tests focus on error paths and validation.
 */
describe('POST /api/v1/auth/invite', () => {
  /**
   * Purpose: Verify that the invite endpoint requires authentication.
   */
  it('should return 401 when no auth token is provided', async () => {
    const res = await api('/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', role: 'member' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that creating an invitation requires the X-Workspace-Id header.
   */
  it('should return 400 when workspace header is missing', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'new@test.com', role: 'member' }),
    });
    expect(res.status).toBe(400);
  });

  /**
   * Purpose: Validate that the invite endpoint rejects invalid email addresses.
   */
  it('should return 422 when email format is invalid', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': 'ws-1' },
      body: JSON.stringify({ email: 'invalid', role: 'member' }),
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/invite/accept', () => {
  /**
   * Purpose: Validate that accepting an invitation requires the invitation token.
   */
  it('should return 422 when invitation token is missing', async () => {
    const res = await api('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123', confirmPassword: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that an invalid or expired invitation token returns a 410 Gone error.
   */
  it('should return 410 when invitation token is invalid or expired', async () => {
    const res = await api('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token', password: 'password123', confirmPassword: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(410);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  const uniqueEmail = () => `forgot-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  it('should return 200 on valid email (silent on unknown)', async () => {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@test.com' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Validate that the forgot-password endpoint requires a valid email format.
   */
  it('should return 422 when email format is invalid for forgot password', async () => {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-email' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 200 on known email', async () => {
    const email = uniqueEmail();
    await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!', name: 'Forgot User' }),
    });

    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  /**
   * Purpose: Validate that resetting password requires the reset token.
   */
  it('should return 422 when reset token is missing', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpass123', confirmPassword: 'newpass123' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that an invalid or expired reset token returns 410 Gone.
   */
  it('should return 410 when reset token is invalid or expired', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid', password: 'newpass123', confirmPassword: 'newpass123' }),
    });
    expect(res.status).toBe(410);
  });

  /**
   * Purpose: Validate that the new password must meet minimum length requirements during reset.
   */
  it('should return 422 when new password is too short during reset', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'some-token', password: '123', confirmPassword: '123' }),
    });
    expect(res.status).toBe(422);
  });
});

/**
 * Tests for the email verification endpoint (GET /verify-email).
 */
describe('GET /api/v1/auth/verify-email', () => {
  /**
   * Purpose: Validate that email verification requires a token parameter.
   */
  it('should return 400 when verification token param is missing', async () => {
    const res = await api('/auth/verify-email');
    expect(res.status).toBe(400);
  });

  /**
   * Purpose: Verify that an invalid verification token returns 410 Gone.
   */
  it('should return 410 when verification token is invalid', async () => {
    const res = await api('/auth/verify-email?token=invalid');
    expect(res.status).toBe(410);
  });
});

/**
 * Tests for the resend verification email endpoint.
 */
describe('POST /api/v1/auth/resend-verification', () => {
  /**
   * Purpose: Verify that resending verification requires the user to be authenticated.
   */
  it('should return 401 when user is not authenticated', async () => {
    const res = await api('/auth/resend-verification', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that users who have already completed email verification cannot trigger the resend verification flow again.
   */
  it('should return 400 when trying to resend verification for an already verified user', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Admin user is already verified in seed
    expect(res.status).toBe(400);
  });
});
