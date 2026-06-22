import { describe, it, expect, beforeAll } from 'vitest';
import { api, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  const res = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  WORKSPACE_ID = json.data?.[0]?.id ?? '';
});

describe('GET /api/v1/workspaces/:wid/repositories', () => {
  /**
   * Purpose: Ensure the repositories list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/repositories`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list repositories for their workspace.
   */
  it('should list repositories for workspace', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/repositories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('PATCH /api/v1/workspaces/:wid/repositories/:repoId', () => {
  /**
   * Purpose: Ensure the repository update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/repositories/nonexistent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'updated' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that updating a non-existent repository returns 404 Not Found.
   */
  it('should return 404 for nonexistent repository', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/repositories/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'updated' }),
    });
    expect(res.status).toBe(404);
  });
});
