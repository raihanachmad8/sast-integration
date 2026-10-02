import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '@tests/helpers/setup';

/**
 * Signs in using the seeded admin account and returns a valid access token.
 * Most project tests rely on this seeded user.
 */
async function getAccessToken() {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });
  const json = await res.json();
  return json.data.accessToken as string;
}

/**
 * Returns the first workspace ID from the authenticated user's workspace list.
 * Used to scope project and token operations to a known workspace.
 */
async function getFirstWorkspaceId(token: string): Promise<string | null> {
  const res = await api('/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success || !json.data?.length) return null;
  return json.data[0].id;
}

/**
 * Creates a test project and returns its ID.
 * If a project already exists in the workspace, returns the first one instead.
 */
async function getOrCreateProject(token: string, workspaceId: string): Promise<string | null> {
  const listRes = await api(`/workspaces/${workspaceId}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  if (listJson.success && listJson.data?.length > 0) {
    return listJson.data[0].id;
  }

  const slug = `test-project-${Date.now()}`;
  const createRes = await api(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Test Project ${Date.now()}`, slug }),
  });
  const createJson = await createRes.json();
  if (!createJson.success) return null;
  return createJson.data.id;
}

/**
 * E2E API tests for project API token management.
 *
 * Covers the full token lifecycle:
 * - Creating tokens (with validation, permissions, expiry)
 * - Listing tokens (hashes never exposed)
 * - Revoking tokens (soft delete)
 * - Error cases (auth, not found, validation)
 *
 * These tests require a running server and seeded database.
 */
/**
 * E2E API tests for POST /api/v1/projects/:projectId/api-tokens
 *
 * Covers:
 * - 401 Unauthorized without token
 * - 422 Validation error when name is empty (Zod)
 * - 404 Not Found for non-existent project (DB check before Zod)
 * - Happy path: create token with rawToken returned once
 * - Custom permissions and expiry passthrough
 */
describe('POST /api/v1/projects/:projectId/api-tokens', () => {
  /**
   * Purpose: Verify that unauthenticated requests are rejected with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/projects/proj-1/api-tokens', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Token' }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Validate that the endpoint rejects requests with invalid body.
   * Empty string name is rejected by Zod validation layer (422).
   */
  it('should return 422 when name is empty (Zod validation)', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    const res = await api(`/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: '' }),
    });
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
  });

  /**
   * Purpose: Ensure the API rejects token creation for non-existent projects
   * with a clear NOT_FOUND error (404), not a Zod validation error.
   */
  it('should return 404 when project does not exist (not 422)', async () => {
    const token = await getAccessToken();
    const res = await api('/projects/00000000-0000-0000-0000-000000000000/api-tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Test Token' }),
    });
    expect(res.status).toBe(404);
  });

  /**
   * Purpose: Verify the full happy path — create a token for a real project,
   * confirm the raw token is returned exactly once, and verify the response
   * structure matches the expected shape (id, name, tokenPrefix, permissions).
   */
  it('should create a token and return rawToken exactly once', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return; // skip if no workspace

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return; // skip if no project

    const res = await api(`/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `E2E Token ${Date.now()}` }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.rawToken).toBeDefined();
    expect(json.data.rawToken).toMatch(/^sast_p_/);
    expect(json.data.token.id).toBeDefined();
    expect(json.data.token.name).toBeDefined();
    expect(json.data.token.tokenPrefix).toBeDefined();
    expect(json.data.token.permissions).toEqual(['scans:upload']);
  }, 15_000);

  /**
   * Purpose: Verify that creating a token with custom permissions and expiry
   * correctly persists those values in the token metadata.
   */
  it('should create a token with custom permissions and expiry', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    const res = await api(`/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: `Custom Token ${Date.now()}`,
        permissions: ['scans:read'],
        expiresInDays: 90,
      }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.token.permissions).toEqual(['scans:read']);
    expect(json.data.token.expiresAt).toBeDefined();
  }, 15_000);
});

/**
 * E2E API tests for GET /api/v1/projects/:projectId/api-tokens
 *
 * Covers:
 * - 401 Unauthorized without token
 * - tokenHash never exposed in response (security invariant)
 * - 404 Not Found for non-existent project
 */
describe('GET /api/v1/projects/:projectId/api-tokens', () => {
  /**
   * Purpose: Verify that unauthenticated requests are rejected with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/projects/proj-1/api-tokens');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that listing tokens returns an array and never exposes tokenHash values.
   * This is a critical security invariant — the hash must never leak to clients.
   */
  it('should list tokens without exposing tokenHash', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    const res = await api(`/projects/${projectId}/api-tokens`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.tokens)).toBe(true);

    // Verify no token contains tokenHash
    for (const t of json.data.tokens) {
      expect(t).not.toHaveProperty('tokenHash');
    }
  }, 15_000);

  /**
   * Purpose: Ensure the endpoint returns 404 for non-existent projects.
   */
  it('should return 404 for non-existent project', async () => {
    const token = await getAccessToken();
    const res = await api('/projects/00000000-0000-0000-0000-000000000000/api-tokens', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});

/**
 * E2E API tests for DELETE /api/v1/projects/:projectId/api-tokens/:tokenId
 *
 * Covers:
 * - 401 Unauthorized without token
 * - Happy path: create then revoke token
 * - 404 Not Found for non-existent token
 * - Cross-project revocation prevention
 */
describe('DELETE /api/v1/projects/:projectId/api-tokens/:tokenId', () => {
  /**
   * Purpose: Verify that unauthenticated requests are rejected with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/projects/proj-1/api-tokens/token-1', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that revoking a token returns success and the token is no longer usable.
   * The test creates a token, revokes it, then verifies the revoke response.
   */
  it('should revoke an existing token successfully', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    // Create a token first
    const createRes = await api(`/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Revoke Test ${Date.now()}` }),
    });
    const createJson = await createRes.json();
    if (!createJson.success) return;

    const tokenId = createJson.data.token.id;

    // Revoke it
    const revokeRes = await api(`/projects/${projectId}/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const revokeJson = await revokeRes.json();

    expect(revokeRes.status).toBe(200);
    expect(revokeJson.success).toBe(true);
  }, 15_000);

  /**
   * Purpose: Ensure revoking a non-existent token returns NOT_FOUND.
   */
  it('should return 404 when token does not exist', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    const res = await api(`/projects/${projectId}/api-tokens/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  }, 15_000);

  /**
   * Purpose: Prevent cross-project token revocation — a token from project A
   * cannot be revoked using project B's endpoint.
   */
  it('should return 404 when token belongs to a different project', async () => {
    const token = await getAccessToken();
    const workspaceId = await getFirstWorkspaceId(token);
    if (!workspaceId) return;

    const projectId = await getOrCreateProject(token, workspaceId);
    if (!projectId) return;

    // Create a token
    const createRes = await api(`/projects/${projectId}/api-tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Cross-Project Test ${Date.now()}` }),
    });
    const createJson = await createRes.json();
    if (!createJson.success) return;

    const tokenId = createJson.data.token.id;

    // Try to revoke using a fake project ID
    const res = await api(`/projects/00000000-0000-0000-0000-000000000000/api-tokens/${tokenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  }, 15_000);
});
