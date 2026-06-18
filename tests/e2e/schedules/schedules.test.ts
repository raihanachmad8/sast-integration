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

describe('GET /api/v1/workspaces/:wid/schedules', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules`);
    expect(res.status).toBe(401);
  });

  it('should list schedules for workspace', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should support pagination', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules?page=1&per_page=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
    expect(json.meta.pagination).toBeDefined();
  });
});

describe('POST /api/v1/workspaces/:wid/schedules', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cronExpression: '0 2 * * 1-5' }),
    });
    expect(res.status).toBe(401);
  });

  it('should create a schedule', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: 'test-repo',
        cronExpression: '0 2 * * 1-5',
        branch: 'main',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
  });
});

describe('GET /api/v1/workspaces/:wid/schedules/:sid', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules/nonexistent`);
    expect(res.status).toBe(401);
  });

  it('should return 404 for nonexistent schedule', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/:wid/schedules/:sid/toggle', () => {
  let token: string;
  let WORKSPACE_ID: string;

  beforeAll(async () => {
    token = await getAccessToken();
    WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules/nonexistent/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 422 for invalid data', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules/nonexistent/toggle`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: 'invalid' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 404 for nonexistent schedule', async () => {
    const res = await fetch(`${API_BASE}/api/v1/workspaces/${WORKSPACE_ID}/schedules/00000000-0000-0000-0000-000000000000/toggle`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(404);
  });
});
