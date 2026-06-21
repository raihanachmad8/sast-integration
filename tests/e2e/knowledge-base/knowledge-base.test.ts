import { describe, it, expect, beforeAll } from 'vitest';
import { api, getFirstWorkspaceId, signin } from '../../helpers/setup';

let token: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
});

describe('GET /api/v1/workspaces/[workspaceId]/knowledge-base', () => {
  /**
   * Purpose: Ensure the knowledge base endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/knowledge-base');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list knowledge base entries.
   */
  it('should return knowledge entries list', async () => {
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/knowledge-base`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Ensure non-members cannot access a workspace's knowledge base.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/knowledge-base', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
