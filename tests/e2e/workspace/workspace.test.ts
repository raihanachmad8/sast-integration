import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

async function getWorkspaceMode() {
  const res = await api('/config');
  const json = await res.json();
  return json.data.workspaceMode as string;
}

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

  it('should reject self-service organization workspace creation', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Test WS ${Date.now()}`, type: 'organization' }),
    });
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it('should create one personal workspace when self-service registration is open', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
    });
    const json = await res.json();

    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      return;
    }

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      name: 'Personal Workspace',
      type: 'personal',
    });

    const list = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const listJson = await list.json();
    expect(listJson.data.filter((ws: { type: string }) => ws.type === 'personal')).toHaveLength(1);
  });

  it('should reject creating a second active personal workspace', async () => {
    const token = await getAccessToken();

    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      const res = await api('/workspaces', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
      });
      expect(res.status).toBe(403);
      return;
    }

    await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
    });
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
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
