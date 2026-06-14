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

describe('GET /api/v1/workspaces/[workspaceId]/model', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/model');
    expect(res.status).toBe(401);
  });

  it('should return AI models list', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/model`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/model', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/model', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Model' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/model`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });
});
