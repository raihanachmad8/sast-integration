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

describe('GET /api/v1/quality-gates', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      headers: { 'X-Workspace-Id': WORKSPACE_ID },
    });
    expect(res.status).toBe(401);
  });

  it('should return 400 without workspace header', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(400);
  });

  it('should get quality gate config', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Workspace-Id': WORKSPACE_ID,
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.threshold).toBeDefined();
  });
});

describe('PUT /api/v1/quality-gates', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': WORKSPACE_ID,
      },
      body: JSON.stringify({ threshold: 'high' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update quality gate config', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Workspace-Id': WORKSPACE_ID,
      },
      body: JSON.stringify({
        threshold: 'high',
        fail_on_critical: true,
        fail_on_high_tp: true,
        warn_on_pending: true,
        require_human_ack: false,
        pending_behavior: 'warn',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('should return 422 for invalid data', async () => {
    const res = await fetch(`${API_BASE}/api/v1/quality-gates`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Workspace-Id': WORKSPACE_ID,
      },
      body: JSON.stringify({ threshold: 'invalid' }),
    });
    expect(res.status).toBe(422);
  });
});
