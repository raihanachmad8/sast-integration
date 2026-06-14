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
import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';
import { ROLE } from '@/commons/constants/permissions';

async function getAccessToken() {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

async function getFirstWorkspaceId(token: string) {
  const res = await api('/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data[0]?.id;
}

describe('GET /api/v1/workspaces/[workspaceId]/members', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members');
    expect(res.status).toBe(401);
  });

  it('should return members list for authenticated workspace member', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should return 403 when user is not a workspace member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/members', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/workspaces/[workspaceId]/members/[userId]/role', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members/user-1/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 when user is not a workspace member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/members/user-1/role', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 422 on invalid role', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/members/user-1/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: 'invalid-role' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 403 when trying to change own role', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Get own userId from members list
    const membersRes = await api(`/workspaces/${wsId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const selfMember = membersJson.data.find((m: { email: string }) => m.email === TEST_USER.email);
    if (!selfMember) return;

    const res = await api(`/workspaces/${wsId}/members/${selfMember.userId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 403 when trying to assign Owner role', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const membersRes = await api(`/workspaces/${wsId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const target = membersJson.data.find((m: { role: string }) => m.role !== ROLE.OWNER);
    if (!target) return;

    const res = await api(`/workspaces/${wsId}/members/${target.userId}/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.OWNER }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 404 when target member does not exist', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/members/00000000-0000-0000-0000-000000000000/role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/members/[userId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/members/user-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('should return 403 when trying to remove self', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const membersRes = await api(`/workspaces/${wsId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const selfMember = membersJson.data.find((m: { email: string }) => m.email === TEST_USER.email);
    if (!selfMember) return;

    const res = await api(`/workspaces/${wsId}/members/${selfMember.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('should return 403 when trying to remove Owner', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const membersRes = await api(`/workspaces/${wsId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const membersJson = await membersRes.json();
    const owner = membersJson.data.find((m: { role: string }) => m.role === ROLE.OWNER);
    if (!owner) return;

    const res = await api(`/workspaces/${wsId}/members/${owner.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('should return 404 when target member does not exist', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/members/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/invitations', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', role: ROLE.MEMBER }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('should create an invitation successfully', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const inviteEmail = `invite-${Date.now()}@example.com`;
    const res = await api(`/workspaces/${wsId}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: ROLE.MEMBER }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/invitations', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations');
    expect(res.status).toBe(401);
  });

  it('should return invitations list for authenticated workspace member', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/invitations/[invitationId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/invitations/inv-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('should revoke an invitation', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create invitation first
    const inviteRes = await api(`/workspaces/${wsId}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: `revoke-${Date.now()}@example.com`, role: ROLE.MEMBER }),
    });
    const inviteJson = await inviteRes.json();
    const invitationId = inviteJson.data.id;

    const res = await api(`/workspaces/${wsId}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);
  });

  it('should return 404 for non-existent invitation', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/invitations/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
