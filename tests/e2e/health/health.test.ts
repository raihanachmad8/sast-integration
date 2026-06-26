import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('GET /api/v1/health', () => {
  /**
   * Purpose: Verify that the health endpoint returns 200 with a healthy status without requiring authentication.
   */
  it('should return health status without auth', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('healthy');
    expect(json.data.timestamp).toBeDefined();
  });

  /**
   * Purpose: Ensure the timestamp field in the health response is a valid ISO 8601 date.
   */
  it('should return valid ISO timestamp', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    const json = await res.json();
    const timestamp = new Date(json.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  /**
   * Purpose: Verify the health response contains all expected fields (success, data.status, data.timestamp).
   * Note: The health route returns { success, data: { status, checks, timestamp } } — no top-level `message` field.
   */
  it('should return consistent response format', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    const json = await res.json();
    expect(json).toHaveProperty('success');
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('status');
    expect(json.data).toHaveProperty('timestamp');
    expect(json.data).toHaveProperty('checks');
    expect(json.data.checks).toHaveProperty('app');
    expect(json.data.checks).toHaveProperty('database');
  });

  /**
   * Purpose: Confirm the health endpoint is accessible without any authorization token.
   */
  it('should not require authentication', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    expect(res.status).toBe(200);
    // Should not return 401
    expect(res.status).not.toBe(401);
  });

  /**
   * Purpose: Ensure the health endpoint responds within an acceptable time threshold (5 seconds).
   */
  it('should return quickly', async () => {
    const start = Date.now();
    await fetch(`${API_BASE}/api/v1/health`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});

describe('❌ negative', () => {
  /**
   * Purpose: Verify that a non-existent health sub-route returns 404 Not Found.
   */
  it('should return 404 when entity does not exist', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health/nonexistent`);
    expect(res.status).toBe(404);
  });
});
