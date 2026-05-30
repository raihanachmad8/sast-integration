import { describe, it, expect } from 'vitest';
import { api, TEST_USER, INVALID_USER } from '../../helpers/setup';

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

  it('should return 401 on non-existent email', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: INVALID_USER.email, password: INVALID_USER.password }),
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('should return 422 on missing email', async () => {
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

  it('should return 422 on invalid email format', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('email');
  });

  it('should return 422 on empty password', async () => {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: '' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('password');
  });

  it('should return 400 on empty body', async () => {
    const res = await api('/auth/signin', { method: 'POST', body: '{}' });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
  });
});
