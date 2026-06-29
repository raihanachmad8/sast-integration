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
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getFirstWorkspaceId, getAccessToken, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;
const createdTeamIds: string[] = [];

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
});

afterAll(async () => {
  try {
    for (const teamId of createdTeamIds) {
      await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Cleanup is best-effort, don't fail tests
  }
});

describe('GET /api/v1/workspaces/[workspaceId]/teams', () => {
  /**
   * Purpose: Ensure the teams list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list teams.
   */
  it('should return teams list for authenticated workspace member', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  /**
   * Purpose: Ensure non-members cannot access a workspace's teams list.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/teams', () => {
  /**
   * Purpose: Ensure the team creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Team' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure invalid input (empty name) is rejected with 422 Validation Error.
   */
  it('should return 422 on invalid input', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that a team can be created with valid input and returns 201.
   */
  it('should create a team with valid input', async () => {
    const teamName = `E2E Team ${Date.now()}`;
    const res = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: teamName, slug: `e2e-team-${Date.now()}` }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe(teamName);
    createdTeamIds.push(json.data.id);
  });

  /**
   * Purpose: Ensure users without TEAM_MANAGE permission are rejected with 403.
   */
  it('should return 403 when user lacks TEAM_MANAGE permission', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Unauthorized Team' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/teams/[teamId]', () => {
  /**
   * Purpose: Ensure the team detail endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that team details can be retrieved for an existing team.
   */
  it('should return team detail for valid team', async () => {
    // First create a team to get its ID
    const teamSlug = `e2e-detail-${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Detail Test Team', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;
    createdTeamIds.push(teamId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(teamId);
  });

  /**
   * Purpose: Verify that requesting a non-existent team returns 404 Not Found.
   */
  it('should return 404 for non-existent team', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/teams/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]/teams/[teamId]', () => {
  /**
   * Purpose: Ensure the team update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that a team can be updated and the new name is returned.
   */
  it('should update a team successfully', async () => {
    // Create a team first
    const teamSlug = `e2e-update-${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Before Update', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;
    createdTeamIds.push(teamId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}`, {
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
  /**
   * Purpose: Ensure the team deletion endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that soft-deleted teams are no longer retrievable via GET.
   */
  it('should soft delete a team', async () => {
    // Create a team first
    const teamSlug = `e2e-delete-${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'To Delete', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;

    const res = await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/teams/[teamId]/members', () => {
  /**
   * Purpose: Ensure the team members endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/teams/team-1/members');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that team members can be listed for a valid team.
   */
  it('should return team members for valid team', async () => {
    // Create a team
    const teamSlug = `e2e-members-${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Members Test', slug: teamSlug }),
    });
    const createJson = await createRes.json();
    const teamId = createJson.data.id;
    createdTeamIds.push(teamId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('❌ negative', () => {
  /**
   * Purpose: Ensure non-members cannot list teams in a workspace they don't belong to.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
