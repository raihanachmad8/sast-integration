import { describe, it, expect } from 'vitest';
import { api, TEST_USER } from '../../helpers/setup';

async function getAccessToken() {
  const res = await api('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
  });
  const json = await res.json();
  return json.data.accessToken;
}

describe('POST /api/v1/auth/invite', () => {
  it('should return 401 without token', async () => {
    const res = await api('/auth/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', role: 'member' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 400 without workspace header', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'new@test.com', role: 'member' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 422 on invalid email', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/invite', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': 'ws-1' },
      body: JSON.stringify({ email: 'invalid', role: 'member' }),
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/invite/accept', () => {
  it('should return 422 without token field', async () => {
    const res = await api('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 410 on invalid token', async () => {
    const res = await api('/auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token', password: 'password123', name: 'Test' }),
    });
    expect(res.status).toBe(410);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  const uniqueEmail = () => `forgot-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  it('should return 200 on valid email (silent on unknown)', async () => {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@test.com' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('should return 422 on invalid email', async () => {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-email' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 200 on known email', async () => {
    const email = uniqueEmail();
    await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'Password123!', name: 'Forgot User' }),
    });

    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  it('should return 422 without token', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpass123' }),
    });
    expect(res.status).toBe(422);
  });

  it('should return 410 on invalid token', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid', password: 'newpass123' }),
    });
    expect(res.status).toBe(410);
  });

  it('should return 422 on short password', async () => {
    const res = await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'some-token', password: '123' }),
    });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/auth/verify-email', () => {
  it('should return 400 without token param', async () => {
    const res = await api('/auth/verify-email');
    expect(res.status).toBe(400);
  });

  it('should return 410 on invalid token', async () => {
    const res = await api('/auth/verify-email?token=invalid');
    expect(res.status).toBe(410);
  });
});

describe('POST /api/v1/auth/resend-verification', () => {
  it('should return 401 without auth', async () => {
    const res = await api('/auth/resend-verification', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('should return 400 if already verified', async () => {
    const token = await getAccessToken();
    const res = await api('/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Admin user is already verified in seed
    expect(res.status).toBe(400);
  });
});
