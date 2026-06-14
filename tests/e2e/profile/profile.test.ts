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

describe('GET /api/v1/users/profile', () => {
  it('should return 401 without token', async () => {
    const res = await api('/users/profile');
    expect(res.status).toBe(401);
  });

  it('should return user profile for authenticated user', async () => {
    const token = await getAccessToken();
    const res = await api('/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('id');
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('should return 401 without token', async () => {
    const res = await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update user profile', async () => {
    const token = await getAccessToken();
    const res = await api('/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: TEST_USER.email }),
    });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/users/me (sessions)', () => {
  it('should return 401 without token', async () => {
    const res = await api('/auth/sessions');
    expect(res.status).toBe(401);
  });

  it('should return sessions list', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
