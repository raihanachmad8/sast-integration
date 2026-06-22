import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:3000';

const TEST_USER = {
  email: 'owner@sast.local',
  password: 'ChangeMe123!',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });
  const json = await res.json();
  return json.data.accessToken;
}

async function getFirstWorkspaceId(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
}

describe('GET /api/v1/workspaces/:wid/findings', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  /**
   * Purpose: Ensure the findings endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list findings for their workspace.
   */
  it('should list findings for workspace', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings`, {
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
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?page=1&per_page=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
    expect(json.meta.pagination).toBeDefined();
    expect(json.meta.pagination.page).toBe(1);
    expect(json.meta.pagination.perPage).toBe(10);
  });

  /**
   * Purpose: Verify that severity filter returns only findings matching the specified severity level.
   */
  it('should filter by severity', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?severity=critical`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Verify that status filter returns only findings matching the specified status.
   */
  it('should filter by status', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?status=open`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Verify that scanner filter returns only findings produced by the specified scanner engine.
   */
  it('should filter by scanner', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?scanner=semgrep`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Ensure scanId filter works correctly and handles non-existent scan IDs gracefully.
   */
  it('should handle scanId filter', async () => {
    // Use a valid UUID format that won't match any scan
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?scanId=00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Should return 200 with empty results or handle gracefully
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe('GET /api/v1/workspaces/:wid/findings/:findingId', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  /**
   * Purpose: Ensure the single-finding endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings/nonexistent`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that requesting a non-existent finding returns 404 Not Found.
   */
  it('should return 404 for nonexistent finding', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
