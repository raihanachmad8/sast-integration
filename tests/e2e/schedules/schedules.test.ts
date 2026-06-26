import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getAccessToken, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;
const createdScheduleIds: string[] = [];

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  const res = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  WORKSPACE_ID = json.data?.[0]?.id ?? '';
});

afterAll(async () => {
  try {
    for (const scheduleId of createdScheduleIds) {
      await api(`/workspaces/${WORKSPACE_ID}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Cleanup is best-effort, don't fail tests
  }
});

describe('GET /api/v1/workspaces/:wid/schedules', () => {
  /**
   * Purpose: Ensure the schedules list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list schedules for their workspace.
   */
  it('should list schedules for workspace', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules`, {
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
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules?page=1&per_page=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta).toBeDefined();
  });
});

describe('POST /api/v1/workspaces/:wid/schedules', () => {
  /**
   * Purpose: Ensure the schedule creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cronExpression: '0 2 * * 1-5' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that a schedule can be created with valid input.
   */
  it('should create a schedule', async () => {
    const reposRes = await api(`/workspaces/${WORKSPACE_ID}/repositories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reposJson = await reposRes.json();
    if (!reposJson.data || reposJson.data.length === 0) return;
    const repositoryId = reposJson.data[0].id;

    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId,
        cronExpression: '0 2 * * 1-5',
        branch: 'main',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    createdScheduleIds.push(json.data.id);
  });
});

describe('GET /api/v1/workspaces/:wid/schedules/:sid', () => {
  /**
   * Purpose: Ensure the single-schedule endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules/nonexistent`);
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that requesting a non-existent schedule returns 404 Not Found.
   */
  it('should return 404 for nonexistent schedule', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/:wid/schedules/:sid/toggle', () => {
  /**
   * Purpose: Ensure the schedule toggle endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules/nonexistent/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure invalid toggle data (non-boolean enabled) is rejected with 422.
   */
  it('should return 422 for invalid data', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules/00000000-0000-0000-0000-000000000000/toggle`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: 'invalid' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that toggling a non-existent schedule returns 404 Not Found.
   */
  it('should return 404 for nonexistent schedule', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/schedules/00000000-0000-0000-0000-000000000000/toggle`, {
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

describe('❌ negative', () => {
  it('should return 403 when workspace does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/schedules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
