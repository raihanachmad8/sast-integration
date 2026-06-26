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
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, TEST_USER, getFirstWorkspaceId, getAccessToken, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;
const createdProjectIds: string[] = [];

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
});

afterAll(async () => {
  try {
    for (const projectId of createdProjectIds) {
      await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Cleanup is best-effort, don't fail tests
  }
});

describe('GET /api/v1/workspaces/[workspaceId]/projects', () => {
  /**
   * Purpose: Ensure the projects list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list projects.
   */
  it('should return projects list for authenticated workspace member', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  /**
   * Purpose: Ensure non-members cannot access a workspace's projects list.
   */
  it('should return 403 when user is not a workspace member', async () => {
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/projects', () => {
  /**
   * Purpose: Ensure the project creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Project' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Ensure invalid input (empty name) is rejected with 422 Validation Error.
   */
  it('should return 422 on invalid input', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(422);
  });

  /**
   * Purpose: Verify that a project can be created with valid input and returns 201.
   */
  it('should create a project with valid input', async () => {
    const projectName = `E2E Project ${Date.now()}`;
    const res = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe(projectName);
    createdProjectIds.push(json.data.id);
  });

  /**
   * Purpose: Verify that optional fields (description, platform, language) are persisted on creation.
   */
  it('should create a project with optional fields', async () => {
    const projectName = `E2E Full Project ${Date.now()}`;
    const res = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
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
    createdProjectIds.push(json.data.id);
  });
});

describe('GET /api/v1/workspaces/[workspaceId]/projects/[projectId]', () => {
  /**
   * Purpose: Ensure the project detail endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that project details can be retrieved for an existing project.
   */
  it('should return project detail for valid project', async () => {
    // Create a project first
    const projectName = `E2E Detail ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;
    createdProjectIds.push(projectId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe(projectId);
  });

  /**
   * Purpose: Verify that requesting a non-existent project returns 404 Not Found.
   */
  it('should return 404 for non-existent project', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/projects/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/workspaces/[workspaceId]/projects/[projectId]', () => {
  /**
   * Purpose: Ensure the project update endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that a project can be updated and the new name is returned.
   */
  it('should update a project successfully', async () => {
    // Create a project first
    const projectName = `E2E Update ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;
    createdProjectIds.push(projectId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}`, {
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
  /**
   * Purpose: Ensure the project deletion endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/projects/proj-1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that soft-deleted projects are no longer retrievable via GET.
   */
  it('should soft delete a project', async () => {
    // Create a project first
    const projectName = `E2E Delete ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;

    const res = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });
});

describe('Project API Token Management', () => {
  /**
   * Purpose: Verify that a project API token can be created and returns the raw token.
   */
  it('should create an API token for a project', async () => {
    // Create a project first
    const projectName = `E2E Token ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;
    createdProjectIds.push(projectId);

    // Create token
    const tokenRes = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}/api-tokens`, {
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

  /**
   * Purpose: Verify that API tokens for a project can be listed with pagination metadata.
   */
  it('should list API tokens for a project', async () => {
    // Create a project first
    const projectName = `E2E ListTokens ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;
    createdProjectIds.push(projectId);

    const res = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}/api-tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.meta.pagination).toBeDefined();
  });

  /**
   * Purpose: Verify that a project API token can be revoked and returns 204.
   */
  it('should revoke an API token', async () => {
    // Create a project first
    const projectName = `E2E Revoke ${Date.now()}`;
    const createRes = await api(`/workspaces/${WORKSPACE_ID}/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: projectName }),
    });
    const createJson = await createRes.json();
    const projectId = createJson.data.id;
    createdProjectIds.push(projectId);

    // Create a token
    const tokenRes = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'To Revoke' }),
    });
    const tokenJson = await tokenRes.json();
    const tokenId = tokenJson.data.token.id;

    // Revoke it
    const revokeRes = await api(`/workspaces/${WORKSPACE_ID}/projects/${projectId}/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(revokeRes.status).toBe(204);
  });
});

describe('❌ negative', () => {
  /**
   * Purpose: Verify that requesting a non-existent user returns 404 Not Found.
   */
  it('should return 404 when entity does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/users/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
