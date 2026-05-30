import { describe, expect, it } from 'vitest';
import { AUTH } from '@/server/modules/auth/constants';

describe('auth refresh cookie', () => {
  it('is scoped to the full app so page-route proxy can read it', () => {
    expect(AUTH.COOKIE.PATH).toBe('/');
  });
});
