import { describe, it, expect, beforeAll } from 'vitest';
import { api, getAccessToken, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  const res = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  WORKSPACE_ID = json.data?.[0]?.id ?? '';
});

describe('GET /api/v1/quality-gates', () => {
  /**
   * Purpose: Ensure the quality gates endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/quality-gates', {
      headers: { 'X-Workspace-Id': WORKSPACE_ID },
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure the quality gates endpoint requires the X-Workspace-Id header.
   */
  it('should return 400 without workspace header', async () => {
    const res = await api('/quality-gates', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(400);
  });

  /**
   * Purpose: Verify that the quality gate configuration can be retrieved successfully.
   */
  it('should get quality gate config', async () => {
    const res = await api('/quality-gates', {
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
  /**
   * Purpose: Ensure the quality gate update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/quality-gates', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': WORKSPACE_ID,
      },
      body: JSON.stringify({ threshold: 'high' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that the quality gate configuration can be updated successfully.
   */
  it('should update quality gate config', async () => {
    const res = await api('/quality-gates', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Workspace-Id': WORKSPACE_ID,
      },
      body: JSON.stringify({
        threshold: 'high',
        failOnCritical: true,
        failOnHighTp: true,
        failOnHigh: true,
        failOnMedium: false,
        failOnLow: false,
        failOnPending: true,
        failOnTp: false,
        warnOnPending: true,
        requireHumanAck: false,
        pendingBehavior: 'warn',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  /**
   * Purpose: Ensure invalid quality gate data (invalid threshold) is rejected with 422.
   */
  it('should return 422 for invalid data', async () => {
    const res = await api('/quality-gates', {
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

describe('❌ negative', () => {
  it('should return 403 when invalid workspace header provided', async () => {
    const token = await getAccessToken();
    const res = await api('/quality-gates', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Workspace-Id': '00000000-0000-0000-0000-000000000000',
      },
    });
    expect(res.status).toBe(403);
  });
});
