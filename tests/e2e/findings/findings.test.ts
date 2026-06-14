import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:3000';
const WORKSPACE_ID = '506416af-1f67-4ae9-906a-e84b20948a72';

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

describe('GET /api/v1/workspaces/:wid/findings', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings`);
    expect(res.status).toBe(401);
  });

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

  it('should filter by severity', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?severity=critical`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('should filter by status', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?status=open`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('should filter by scanner', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings?scanner=semgrep`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

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

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings/nonexistent`);
    expect(res.status).toBe(401);
  });

  it('should return 404 for nonexistent finding', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/findings/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
