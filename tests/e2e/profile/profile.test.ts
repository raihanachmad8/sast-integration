import { describe, it, expect } from 'vitest';
import { api, getAccessToken } from '../../helpers/setup';

describe('GET /api/v1/users/profile', () => {
  /**
   * Purpose: Ensure the profile endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/users/profile');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can retrieve their own profile.
   */
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

describe('PUT /api/v1/users/profile', () => {
  /**
   * Purpose: Ensure the profile update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can update their profile name.
   */
  it('should update user profile', async () => {
    const token = await getAccessToken();
    const res = await api('/users/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('GET /api/v1/auth/sessions', () => {
  /**
   * Purpose: Ensure the sessions endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/auth/sessions');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list their active sessions.
   */
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
