/**
 * Unit tests for authentication cookie configuration.
 *
 * These tests validate the cookie settings used for refresh tokens,
 * ensuring they are correctly configured for security and accessibility
 * across the application (including route proxies and middleware).
 */
import { describe, expect, it } from 'vitest';
import { AUTH } from '@/server/modules/auth/constants';

/**
 * Tests related to the refresh token cookie configuration.
 */
describe('auth refresh cookie', () => {
  /**
   * Purpose: Verify that the refresh token cookie is scoped to the root path ('/').
   * This ensures that both page routes and API routes (via proxy) can access the cookie.
   */
  it('is scoped to the root path so that both page routes and API proxies can read the refresh token', () => {
    expect(AUTH.COOKIE.PATH).toBe('/');
  });
});
