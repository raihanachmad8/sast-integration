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

describe('GET /api/v1/workspaces', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces');
    expect(res.status).toBe(401);
  });

  it('should return user workspaces', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('POST /api/v1/workspaces', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces', { method: 'POST', body: JSON.stringify({ name: 'Test' }) });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('should create workspace', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Test WS ${Date.now()}` }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.name).toContain('Test WS');
    expect(json.data.slug).toBeDefined();
  });

  it('should return 409 on duplicate slug', async () => {
    const token = await getAccessToken();
    const slug = `dup-${Date.now()}`;
    await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Dup', slug }),
    });
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Dup2', slug }),
    });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('should return 401 without token', async () => {
    const res = await api('/users/me', { method: 'PATCH', body: JSON.stringify({ currentWorkspaceId: 'x' }) });
    expect(res.status).toBe(401);
  });

  it('should return 403 if not member of workspace', async () => {
    const token = await getAccessToken();
    const res = await api('/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentWorkspaceId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(403);
  });
});
