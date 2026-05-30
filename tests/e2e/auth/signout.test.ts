import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';

describe('POST /api/v1/auth/signout', () => {
  async function getAccessToken() {
    const res = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    });
    const json = await res.json();
    return json.data.accessToken;
  }

  // Positive
  it('should sign out and invalidate session', async () => {
    const token = await getAccessToken();

    const res = await api('/auth/signout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
  });

  it('should clear refresh_token cookie', async () => {
    const token = await getAccessToken();

    const res = await api('/auth/signout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('refresh_token');
  });

  // Negative
  it('should return 401 without token', async () => {
    const res = await api('/auth/signout', { method: 'POST' });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AUTH_ERROR');
  });

  it('should return 401 with invalid token', async () => {
    const res = await api('/auth/signout', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token-here' },
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('should return 401 after session already invalidated', async () => {
    const token = await getAccessToken();

    // First signout
    await api('/auth/signout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    // Second signout with same token — session gone
    const res = await api('/auth/signout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });
});
