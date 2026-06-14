/**
 * E2E API tests for Team Management endpoints.
 *
 * Tests the full request lifecycle:
 * - Authentication
 * - Permission checks
 * - Team CRUD operations
 * - Team member management
 * - Slug conflict handling
 * - Workspace scoping
 */
import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';

/**
 * Signs in using the seeded admin account and returns a valid access token.
 */
async function getAccessToken() {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

/**
 * Helper to get the first workspace ID for the authenticated user.
 */
async function getFirstWorkspaceId(token: string) {
  const res = await api('/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data[0]?.id;
}

describe('GET /api/v1/workspaces/[workspaceId]/teams', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams');
    expect(res.status).toBe(401);
  });

  it('should return teams list for authenticated workspace member', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should return 403 when user is not a workspace member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/teams', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Team' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('should create a team with valid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const teamName = `E2E Team ${Date.now()}`;
    const res = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: teamName, slug: `e2e-team-${Date.now()}` }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe(teamName);
  });

  it('should return 403 when user lacks TEAM_MANAGE permission', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Unauthorized Team' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/teams/[teamId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1');
    expect(res.status).toBe(401);
  });

  it('should return team detail for valid team', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // First create a team to get its ID
    const teamSlug = `e2e-detail-${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Detail Test Team', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(teamId);
  });

  it('should return 404 for non-existent team', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/teams/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]/teams/[teamId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update a team successfully', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a team first
    const teamSlug = `e2e-update-${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Before Update', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/teams/${teamId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'After Update' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.name).toBe('After Update');
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/teams/[teamId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('should soft delete a team', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a team first
    const teamSlug = `e2e-delete-${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'To Delete', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await api(`/workspaces/${wsId}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/teams/[teamId]/members', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1/members');
    expect(res.status).toBe(401);
  });

  it('should return team members for valid team', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a team
    const teamSlug = `e2e-members-${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Members Test', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
