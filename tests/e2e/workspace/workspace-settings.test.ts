import { describe, it, expect, beforeAll } from 'vitest';
import { api, getFirstWorkspaceId, signin } from '../../helpers/setup';

let token: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
});

describe('GET /api/v1/workspaces/[workspaceId]', () => {
  /**
   * Purpose: Ensure the workspace detail endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated members can retrieve workspace details.
   */
  it('should return workspace details', async () => {
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

  /**
   * Purpose: Ensure non-members cannot retrieve workspace details.
   */
  it('should return 403 when user is not a member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]', () => {
  /**
   * Purpose: Ensure the workspace update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that workspace settings can be updated by the owner.
   */
  it('should update workspace settings (owner only)', async () => {
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

describe('POST /api/v1/workspaces/switch', () => {
  /**
   * Purpose: Ensure the workspace switch endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/switch', {
      method: 'POST',
      body: JSON.stringify({ currentWorkspaceId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that an authenticated user can switch their active workspace.
   */
  it('should switch active workspace', async () => {
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api('/workspaces/switch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentWorkspaceId: wsId }),
    });
    expect(res.status).toBe(200);
  });
});
