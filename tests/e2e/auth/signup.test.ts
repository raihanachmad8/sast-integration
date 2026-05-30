import { describe, it, expect } from 'vitest';
import { api } from '../../helpers/setup';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';

async function getWorkspaceMode() {
  const res = await api('/config');
  const json = await res.json();
  return json.data.workspaceMode as string;
}

describe('POST /api/v1/auth/signup', () => {
  const uniqueEmail = () => `test-${Date.now()}@example.com`;

  // Positive
  it('should create user with one personal owner workspace when registration is open', async () => {
    const email = uniqueEmail();
    const password = 'Password123!';
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: 'New User' }),
    });
    const json = await res.json();

    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      return;
    }

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.email).toBeDefined();
    expect(json.data.id).toBeDefined();

    const signin = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const signinJson = await signin.json();

    expect(signin.status).toBe(200);
    expect(signinJson.data.user.currentWorkspaceId).toBeDefined();
    expect(signinJson.data.workspace).toMatchObject({
      name: 'Personal Workspace',
      role: 'owner',
    });

    const workspaces = await api('/workspaces', {
      headers: { Authorization: `Bearer ${signinJson.data.accessToken}` },
    });
    const workspacesJson = await workspaces.json();

    expect(workspaces.status).toBe(200);
    expect(workspacesJson.data).toHaveLength(1);
    expect(workspacesJson.data[0]).toMatchObject({
      name: 'Personal Workspace',
      type: 'personal',
      role: 'owner',
    });
  }, 15_000);

  // Negative
  it('should return 409 on duplicate email when registration is open', async () => {
    const email = uniqueEmail();
    await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!', name: 'User' }),
    });

    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!', name: 'User' }),
    });
    const json = await res.json();

    if (await getWorkspaceMode() === WORKSPACE_MODE.SINGLE) {
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      return;
    }

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
  });

  it('should return 422 on short password', async () => {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: '123', name: 'User' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('password');
  });

  it('should return 422 on missing name', async () => {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: 'Password123!' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('name');
  });

  it('should return 422 on invalid email', async () => {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad', password: 'Password123!', name: 'User' }),
    });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error.details.fields[0].field).toBe('email');
  });
});
