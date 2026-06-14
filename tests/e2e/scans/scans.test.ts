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

describe('GET /api/v1/workspaces/:wid/scans', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans`);
    expect(res.status).toBe(401);
  });

  it('should list scans for workspace', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should support pagination', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans?page=1&per_page=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
    expect(json.meta.pagination).toBeDefined();
    expect(json.meta.pagination.page).toBe(1);
    expect(json.meta.pagination.perPage).toBe(5);
  });

  it('should filter by status', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans?status=completed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe('GET /api/v1/workspaces/:wid/scans/:scanId', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans/nonexistent`);
    expect(res.status).toBe(401);
  });

  it('should return 404 for nonexistent scan', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/scans/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
