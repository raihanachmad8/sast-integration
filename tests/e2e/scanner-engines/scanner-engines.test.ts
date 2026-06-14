import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:3000';

const TEST_USER = {
  email: 'owner@sast.local',
  password: 'ChangeMe123!',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });
  const json = await res.json();
  return json.data.accessToken;
}

describe('GET /api/v1/scanner-engines', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAccessToken();
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${API_BASE}/api/v1/scanner-engines`);
    expect(res.status).toBe(401);
  });

  it('should list scanner engines', async () => {
    const res = await fetch(`${API_BASE}/api/v1/scanner-engines`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.scanners).toBeDefined();
    expect(Array.isArray(json.data.scanners)).toBe(true);
  });

  it('should return scanners with required fields', async () => {
    const res = await fetch(`${API_BASE}/api/v1/scanner-engines`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const scanner = json.data.scanners[0];
    expect(scanner.name).toBeDefined();
    expect(scanner.command).toBeDefined();
    expect(scanner.format).toBeDefined();
    expect(typeof scanner.isAvailable).toBe('boolean');
    expect(scanner.status).toMatch(/^(ready|not_installed)$/);
  });
});
