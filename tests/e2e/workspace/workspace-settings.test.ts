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

async function getFirstWorkspaceId(token: string) {
  const res = await api('/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data[0]?.id;
}

describe('GET /api/v1/workspaces/[workspaceId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1');
    expect(res.status).toBe(401);
  });

  it('should return workspace details', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('id');
  });

  it('should return 403 when user is not a member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update workspace settings (owner only)', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: 'Updated by E2E test' }),
    });
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/users/me (switch workspace)', () => {
  it('should return 401 without token', async () => {
    const res = await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ currentWorkspaceId: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  it('should switch active workspace', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api('/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentWorkspaceId: wsId }),
    });
    expect(res.status).toBe(200);
  });
});
