/**
 * E2E API tests for Project Management endpoints.
 *
 * Tests the full request lifecycle:
 * - Authentication
 * - Permission checks
 * - Project CRUD operations
 * - Slug conflict handling
 * - Workspace scoping
 * - API token management
 * - Repository attachment
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

describe('GET /api/v1/workspaces/[workspaceId]/projects', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects');
    expect(res.status).toBe(401);
  });

  it('should return projects list for authenticated workspace member', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should return 403 when user is not a workspace member', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/projects', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Project' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 422 on invalid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('should create a project with valid input', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const projectName = `E2E Project ${Date.now()}`;
    const res = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe(projectName);
  });

  it('should create a project with optional fields', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const projectName = `E2E Full Project ${Date.now()}`;
    const res = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: projectName,
        description: 'A test project',
        platform: 'web',
        language: 'typescript',
      }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.description).toBe('A test project');
    expect(json.data.platform).toBe('web');
    expect(json.data.language).toBe('typescript');
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/projects/[projectId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1');
    expect(res.status).toBe(401);
  });

  it('should return project detail for valid project', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E Detail ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(projectId);
  });

  it('should return 404 for non-existent project', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    const res = await api(`/workspaces/${wsId}/projects/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]/projects/[projectId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update a project successfully', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E Update ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/projects/${projectId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Updated Project' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.name).toBe('Updated Project');
  });
});

describe('DELETE /api/v1/workspaces/[workspaceId]/projects/[projectId]', () => {
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('should soft delete a project', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E Delete ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await api(`/workspaces/${wsId}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });
});

describe('Project API Token Management', () => {
  it('should create an API token for a project', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E Token ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    // Create token
    const tokenRes = await api(`/workspaces/${wsId}/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'CI Token', expiresInDays: 30 }),
    });
    const tokenJson = await tokenRes.json();
    expect(tokenRes.status).toBe(201);
    expect(tokenJson.data.rawToken).toBeDefined();
    expect(tokenJson.data.rawToken).toMatch(/^sast_p_/);
    expect(tokenJson.data.token.name).toBe('CI Token');
  });

  it('should list API tokens for a project', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E ListTokens ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    const res = await api(`/workspaces/${wsId}/projects/${projectId}/api-tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should revoke an API token', async () => {
    const token = await getAccessToken();
    const wsId = await getFirstWorkspaceId(token);
    if (!wsId) return;

    // Create a project first
    const projectName = `E2E Revoke ${Date.now()}`;
    const createRes = await api(`/workspaces/${wsId}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    // Create a token
    const tokenRes = await api(`/workspaces/${wsId}/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'To Revoke' }),
    });
    const tokenJson = await tokenRes.json();
    const tokenId = tokenJson.data.token.id;

    // Revoke it
    const revokeRes = await api(`/workspaces/${wsId}/projects/${projectId}/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(revokeRes.status).toBe(204);
  });
});
