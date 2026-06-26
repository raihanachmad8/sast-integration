import { describe, it, expect, beforeAll } from 'vitest';
import { api, getAccessToken, signin } from '../../helpers/setup';

let token: string;

beforeAll(async () => {
  const session = await signin();
  token = session.accessToken;
});

describe('GET /api/v1/scanner-engines', () => {
  /**
   * Purpose: Ensure the scanner engines endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 without token', async () => {
    const res = await api('/scanner-engines');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that authenticated users can list available scanner engines.
   */
  it('should list scanner engines', async () => {
    const res = await api('/scanner-engines', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * Purpose: Ensure each scanner engine entry includes required fields (name, command, format, status).
   */
  it('should return scanners with required fields', async () => {
    const res = await api('/scanner-engines', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length === 0) return; // no scanners configured — skip field checks
    const scanner = json.data[0];
    expect(scanner.name).toBeDefined();
    expect(scanner.command).toBeDefined();
    expect(scanner.format).toBeDefined();
    expect(typeof scanner.isAvailable).toBe('boolean');
    expect(scanner.status).toMatch(/^(ready|not_installed)$/);
  });
});

describe('❌ negative', () => {
  /**
   * Purpose: Ensure the scanner engines endpoint rejects unauthenticated requests with 401.
   */
  it('should return 401 when no auth token provided', async () => {
    const res = await api('/scanner-engines');
    expect(res.status).toBe(401);
  });

  /**
   * Purpose: Verify that requesting a non-existent scanner engine returns 404 Not Found.
   */
  it('should return 404 when entity does not exist', async () => {
    const token = await getAccessToken();
    const res = await api('/scanner-engines/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
