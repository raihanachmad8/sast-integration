import { describe, it, expect } from 'vitest';
import { api } from '../helpers/setup';

describe('POST /api/v1/auth/signup', () => {
  const uniqueEmail = () => `test-${Date.now()}@example.com`;

  // Positive
  it('should create user and return data', async () => {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail(), password: 'Password123!', name: 'New User' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.email).toBeDefined();
    expect(json.data.id).toBeDefined();
  });

  // Negative
  it('should return 409 on duplicate email', async () => {
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
