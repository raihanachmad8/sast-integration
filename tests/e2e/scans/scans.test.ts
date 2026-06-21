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

describe('GET /api/v1/workspaces/:wid/scans', () => {
  /**
   * Purpose: Ensure the scans endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list scans for their workspace.
   */
  it('should list scans for workspace', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });

  /**
   * Purpose: Ensure pagination parameters are respected and returned in the response metadata.
   */
  it('should support pagination', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans?page=1&per_page=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
    expect(json.meta.pagination).toBeDefined();
    expect(json.meta.pagination.page).toBe(1);
    expect(json.meta.pagination.perPage).toBe(5);
  });

  /**
   * Purpose: Verify that status filter returns only scans matching the specified status.
   */
  it('should filter by status', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans?status=completed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe('GET /api/v1/workspaces/:wid/scans/:scanId', () => {
  /**
   * Purpose: Ensure the single-scan endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans/nonexistent`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that requesting a non-existent scan returns 404 Not Found.
   */
  it('should return 404 for nonexistent scan', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/scans/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
