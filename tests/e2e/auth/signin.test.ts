import { describe, it, expect } from 'vitest';
import { api, TEST_USER, INVALID_USER } from '../../helpers/setup';

/**
 * E2E API tests for the sign-in endpoint.
 *
 * Covers happy path, cookie behavior, and various error cases
 * (wrong password, non-existent user, validation errors).
 */
describe('POST /api/v1/auth/signin', () => {
  // Positive cases
  it('should return tokens and user on valid credentials', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.tokenType).toBe('Bearer');
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.expiresAt).toBeDefined();
    expect(json.data.expiresIn).toBeGreaterThan(0);
    expect(json.data.user.email).toBe(TEST_USER.email);
    expect(json.data.user).toHaveProperty('emailVerified');
    expect(json.meta).toEqual(expect.objectContaining({ requestId: expect.any(String), timestamp: expect.any(String) }));
  });

  it('should set refresh_token cookie', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    });

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('refresh_token');
    expect(setCookie).toContain('HttpOnly');
  });

  // Negative cases
  /**
   * Purpose: Ensure that providing a correct email but wrong password results in 401 Unauthorized.
   * This protects against credential stuffing and confirms proper password verification.
   */
  it('should return 401 on wrong password', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: 'wrong-password' }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_ERROR');
  });

  /**
   * Purpose: Verify that signing in with an email that does not exist returns 401.
   * We do not leak whether an email is registered or not (security best practice).
   */
  it('should return 401 on non-existent email', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: INVALID_USER.email, password: INVALID_USER.password }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  /**
   * Purpose: Validate that the signin endpoint requires an email field and returns proper validation error when missing.
   */
  it('should return 422 when email is missing', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );
  });

  /**
   * Purpose: Ensure the API validates email format strictly during sign-in.
   */
  it('should return 422 when email format is invalid', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('email');
  });

  /**
   * Purpose: Validate that the signin endpoint requires a password and returns validation error when it is empty.
   */
  it('should return 422 when password is empty', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: '' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('password');
  });

  /**
   * Purpose: Ensure that sending an empty body to signin returns a proper validation error.
   */
  it('should return 422 when request body is empty', async () => {
    const res = await api('/auth/signin', { method: 'POST', body: '{}' });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
  });
});
