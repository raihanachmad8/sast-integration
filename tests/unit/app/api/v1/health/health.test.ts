import { describe, it, expect, vi } from 'vitest';

vi.mock('@/server/lib/logger', () => ({
  logger: {
    app: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  },
}));

vi.mock('@/server/modules/health/health.service', () => ({
  healthService: {
    check: vi.fn().mockResolvedValue({
      status: 'healthy',
      statusCode: 200,
      checks: { app: 'healthy', database: 'healthy' },
    }),
  },
}));

import { GET } from '@/app/api/v1/health/route';

describe('Health API Route', () => {
  it('should return healthy status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });

  it('should return valid ISO timestamp', async () => {
    const response = await GET();
    const data = await response.json();

    const timestamp = new Date(data.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it('should return consistent response structure', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('timestamp');
    expect(data.data).toHaveProperty('checks');
    expect(data.data.checks).toHaveProperty('app');
    expect(data.data.checks).toHaveProperty('database');
  });

  it('should not require authentication', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.status).not.toBe(401);
  });

  it('should return healthy status text', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.data.status).toBe('healthy');
    expect(data.data.checks.app).toBe('healthy');
    expect(data.data.checks.database).toBe('healthy');
  });
});
