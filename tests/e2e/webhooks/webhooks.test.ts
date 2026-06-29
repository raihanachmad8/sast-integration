import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, getFirstWorkspaceId, getAccessToken, signin } from '../../helpers/setup';

let token: string;
let WORKSPACE_ID: string;
const createdWebhookIds: string[] = [];

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
  WORKSPACE_ID = (await getFirstWorkspaceId(token)) ?? '';
});

afterAll(async () => {
  try {
    for (const webhookId of createdWebhookIds) {
      await api(`/workspaces/${WORKSPACE_ID}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Cleanup is best-effort, don't fail tests
  }
});

describe('GET /api/v1/workspaces/[workspaceId]/webhooks', () => {
  /**
   * Purpose: Ensure the webhooks list endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/webhooks');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated workspace members can list webhooks.
   */
  it('should return webhooks list', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('POST /api/v1/workspaces/[workspaceId]/webhooks', () => {
  /**
   * Purpose: Ensure the webhook creation endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/workspaces/ws-1/webhooks', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://example.com', events: ['scan.completed'] }),
    });
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that a webhook can be created with valid input and returns 201.
   */
  it('should create a webhook', async () => {
    const res = await api(`/workspaces/${WORKSPACE_ID}/webhooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: `E2E Webhook ${Date.now()}`,
        url: 'https://example.com/hook',
        events: ['scan.completed'],
      }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    createdWebhookIds.push(json.data.id);
  });
});

describe('❌ negative', () => {
  it('should return 403 when workspace does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/workspaces/00000000-0000-0000-0000-000000000000/webhooks', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
