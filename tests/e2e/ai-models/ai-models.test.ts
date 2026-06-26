import { describe, it, expect, beforeAll } from 'vitest';
import { api, getFirstWorkspaceId, getAccessToken, signin } from '../../helpers/setup';

let token: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
});

describe('GET /api/v1/workspaces/[workspaceId]/model', () => {
  /**
   * Purpose: Ensure the AI models list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/model');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list available AI models for their workspace.
   */
  it('should return AI models list', async () => {
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
  /**
   * Purpose: Ensure the AI model creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/model', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Model' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure invalid input (empty name) is rejected with 422 Validation Error.
   */
  it('should return 422 on invalid input', async () => {
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

describe('❌ negative', () => {
  it('should return 403 when workspace does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/model', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
