import { describe, it, expect, beforeAll } from 'vitest';
import { api, TEST_USER, getAccessToken, signin } from '../../helpers/setup';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

/**
 * Get workspace mode from environment variable.
 */
function getWorkspaceMode(): string {
  return process.env.WORKSPACE_MODE || 'single';
}

let token: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
});

/**
 * E2E API tests for workspace listing and creation.
 *
 * These tests are particularly sensitive to database state because they
 * interact with personal workspaces of the seeded admin user.
 */
describe('GET /api/v1/workspaces', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces');
    expect(res.status).toBe(401);
  });

  it('should return user workspaces', async () => {
    const res = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

/**
 * Tests specifically for workspace creation rules, including:
 * - Personal workspace self-service (mode dependent)
 * - Prevention of multiple personal workspaces per user
 * - Rejection of organization workspace self-creation
 */
describe('POST /api/v1/workspaces', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces', { method: 'POST', body: JSON.stringify({ name: 'Test' }) });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('should reject self-service organization workspace creation', async () => {
    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Test WS ${Date.now()}`, type: 'organization' }),
    });
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  /**
   * Purpose: In MULTIPLE mode, an existing seeded user (who never went through signup)
   * should still be able to self-create their personal workspace.
   *
   * This test is defensive against pre-existing data because the admin user
   * may already have a personal workspace from previous manual testing or runs.
   */
  it('should create one personal workspace when self-service registration is open', async () => {
    // Check current state first (makes test resilient to pre-existing data from previous runs/manual testing)
    const initialList = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const initialJson = await initialList.json();
    const existingPersonal = initialJson.data.filter((ws: { type: string }) => ws.type === 'personal');

    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      const res = await api('/workspaces', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
      });
      // SINGLE mode: 403 (blocked) or 409 (conflict) — both prevent creation
      expect([403, 409]).toContain(res.status);
      return;
    }

    if (existingPersonal.length >= 1) {
      // Already has one — scenario goal is satisfied (common in local dev DBs)
      expect(existingPersonal).toHaveLength(1);
      return;
    }

    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      name: 'Personal Workspace',
      type: 'personal',
    });

    const list = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const listJson = await list.json();
    expect(listJson.data.filter((ws: { type: string }) => ws.type === 'personal')).toHaveLength(1);
  });

  /**
   * Purpose: Verify the business rule that a user can only have **one** active personal workspace.
   *
   * The test ensures at least one personal workspace exists before attempting
   * to create a second one (defensive against test ordering / previous skips).
   */
  it('should reject creating a second active personal workspace', async () => {
    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      const res = await api('/workspaces', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
      });
      // SINGLE mode: 403 (blocked) or 409 (conflict — already has one)
      expect([403, 409]).toContain(res.status);
      return;
    }

    // Ensure at least one exists (defensive against previous test skips)
    const currentList = await api('/workspaces', { headers: { Authorization: `Bearer ${token}` } });
    const currentJson = await currentList.json();
    const personalCount = currentJson.data.filter((ws: { type: string }) => ws.type === 'personal').length;

    if (personalCount === 0) {
      await api('/workspaces', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
      });
    }

    const res = await api('/workspaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Personal Workspace', type: 'personal' }),
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/workspaces/switch', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/switch', { method: 'POST', body: JSON.stringify({ currentWorkspaceId: 'x' }) });
    expect(res.status).toBe(401);
  });

  it('should return 403 if not member of workspace', async () => {
    const res = await api('/workspaces/switch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentWorkspaceId: '00000000-0000-0000-0000-000000000000' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('❌ negative', () => {
  /**
   * Purpose: Verify behavior when requesting a non-existent workspace returns 403 or 404.
   */
  it('should return 403 or 404 when workspace does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([403, 404]).toContain(res.status);
  });
});
