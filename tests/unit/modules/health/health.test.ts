import { describe, it, expect } from 'vitest';
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
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('status');
    expect(data.data).toHaveProperty('timestamp');
  });

  it('should not require authentication', async () => {
    // Health endpoint is public - no auth header needed
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.status).not.toBe(401);
  });

  it('should return OK message', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.message).toBe('OK');
  });
});
