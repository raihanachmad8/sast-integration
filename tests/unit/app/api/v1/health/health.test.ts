import { describe, it, expect, vi } from 'vitest';

// The health route imports db from @/server/db/client.
// Mock it so tests don't need a real PostgreSQL connection.
vi.mock('@/server/db/client', () => ({
  db: {
    execute: vi.fn(),
  },
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    scan: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
  },
}));

import { GET } from '@/app/api/v1/health/route';
import { db } from '@/server/db/client';

describe('Health API Route', () => {
  /**
   * Purpose: Validates that the health endpoint returns a healthy status
   */
  it('should return healthy status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('healthy');
  });

  /**
   * Purpose: Validates that the timestamp is a valid ISO date string
   */
  it('should return valid ISO timestamp', async () => {
    const response = await GET();
    const data = await response.json();

    const timestamp = new Date(data.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  /**
   * Purpose: Validates that the response contains all required fields
   */
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

  /**
   * Purpose: Validates that the health endpoint is publicly accessible without auth
   */
  it('should not require authentication', async () => {
    // Health endpoint is public - no auth header needed
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.status).not.toBe(401);
  });

  /**
   * Purpose: Validates that the response indicates healthy status
   */
  it('should return healthy status text', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.data.status).toBe('healthy');
    expect(data.data.checks.app).toBe('healthy');
    expect(data.data.checks.database).toBe('healthy');
  });
});
