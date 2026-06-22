/**
 * E2E API tests for Workspace Member Management endpoints.
 *
 * Tests the full request lifecycle:
 * - Listing members
 * - Changing member roles
 * - Removing members
 * - Inviting members
 * - Revoking invitations
 *
 * Focus is on permission checks, ownership rules, and workspace scoping.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, TEST_USER, getFirstWorkspaceId, signin } from '../../helpers/setup';
import { ROLE } from '@/commons/constants/permissions';

let token: string;
let WORKSPACE_ID: string;
const createdInvitationIds: string[] = [];

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
});

afterAll(async () => {
  try {
    for (const invitationId of createdInvitationIds) {
      await api(`/workspaces/${WORKSPACE_ID}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Cleanup is best-effort, don't fail tests
  }
});

describe('GET /api/v1/workspaces/[workspaceId]/members', () => {
  /**
   * Purpose: Ensure the members list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list members.
   */
  it('should return members list for authenticated workspace member', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  /**
   * Purpose: Ensure non-members cannot access a workspace's members list.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/members', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/workspaces/[workspaceId]/members/[userId]', () => {
  /**
   * Purpose: Ensure the member role update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members/user-1', {
      method: 'PATCH',
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure non-members cannot update member roles in a workspace.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/members/user-1', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(403);
  });

  /**
   * Purpose: Ensure invalid role values are rejected with 422 Validation Error.
   */
  it('should return 422 on invalid role', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/members/user-1`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: 'invalid-role' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Prevent users from changing their own role to enforce separation of duties.
   */
  it('should return 403 when trying to change own role', async () => {
    // Get own userId from members list
    const membersRes = await api(`/workspaces/${WORKSPACE_ID}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const selfMember = membersJson.data.find((m: { email: string }) => m.email === TEST_USER.email);
    if (!selfMember) return;

    const res = await api(`/workspaces/${WORKSPACE_ID}/members/${selfMember.userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(403);
  });

  /**
   * Purpose: Prevent assignment of the Owner role through the member update endpoint.
   */
  it('should return 403 when trying to assign Owner role', async () => {
    const membersRes = await api(`/workspaces/${WORKSPACE_ID}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const target = membersJson.data.find((m: { role: string }) => m.role !== ROLE.OWNER);
    if (!target) return;

    const res = await api(`/workspaces/${WORKSPACE_ID}/members/${target.userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.OWNER }),
    });
    // 403 (forbidden) or 422 (validation error — owner role not allowed)
    expect([403, 422]).toContain(res.status);
  });

  /**
   * Purpose: Verify that updating a non-existent member returns 404 Not Found.
   */
  it('should return 404 when target member does not exist', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/members/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/members/[userId]', () => {
  /**
   * Purpose: Ensure the member removal endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members/user-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Prevent users from removing themselves from a workspace.
   */
  it('should return 403 when trying to remove self', async () => {
    const membersRes = await api(`/workspaces/${WORKSPACE_ID}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const selfMember = membersJson.data.find((m: { email: string }) => m.email === TEST_USER.email);
    if (!selfMember) return;

    const res = await api(`/workspaces/${WORKSPACE_ID}/members/${selfMember.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  /**
   * Purpose: Prevent removal of the workspace Owner to maintain ownership integrity.
   */
  it('should return 403 when trying to remove Owner', async () => {
    const membersRes = await api(`/workspaces/${WORKSPACE_ID}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const owner = membersJson.data.find((m: { role: string }) => m.role === ROLE.OWNER);
    if (!owner) return;

    const res = await api(`/workspaces/${WORKSPACE_ID}/members/${owner.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  /**
   * Purpose: Verify that removing a non-existent member returns 404 Not Found.
   */
  it('should return 404 when target member does not exist', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/members/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/invitations', () => {
  /**
   * Purpose: Ensure the invitation creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure invalid input (empty email) is rejected with 422 Validation Error.
   */
  it('should return 422 on invalid input', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: '' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that a workspace invitation can be created and returns 201.
   */
  it('should create an invitation successfully', async () => {
    const inviteEmail = `invite-${Date.now()}@example.com`;
    const res = await api(`/workspaces/${WORKSPACE_ID}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: ROLE.MEMBER }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    createdInvitationIds.push(json.data.id);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/invitations', () => {
  /**
   * Purpose: Ensure the invitations list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list pending invitations.
   */
  it('should return invitations list for authenticated workspace member', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/invitations/[invitationId]', () => {
  /**
   * Purpose: Ensure the invitation revocation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations/inv-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that a pending invitation can be revoked and returns 204.
   */
  it('should revoke an invitation', async () => {
    // Create invitation first
    const inviteRes = await api(`/workspaces/${WORKSPACE_ID}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: `revoke-${Date.now()}@example.com`, role: ROLE.MEMBER }),
    });
    const inviteJson = await inviteRes.json();
    const invitationId = inviteJson.data.id;

    const res = await api(`/workspaces/${WORKSPACE_ID}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);
  });

  /**
   * Purpose: Verify that revoking a non-existent invitation returns 404 Not Found.
   */
  it('should return 404 for non-existent invitation', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/invitations/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
