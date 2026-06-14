import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('GET /api/v1/health', () => {
  it('should return health status without auth', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('healthy');
    expect(json.data.timestamp).toBeDefined();
  });

  it('should return valid ISO timestamp', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    const json = await res.json();
    const timestamp = new Date(json.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it('should return consistent response format', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    const json = await res.json();
    expect(json).toHaveProperty('success');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('status');
    expect(json.data).toHaveProperty('timestamp');
  });

  it('should not require authentication', async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    expect(res.status).toBe(200);
    // Should not return 401
    expect(res.status).not.toBe(401);
  });

  it('should return quickly', async () => {
    const start = Date.now();
    await fetch(`${API_BASE}/api/v1/health`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
