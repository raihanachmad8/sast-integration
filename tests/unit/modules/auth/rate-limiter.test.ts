/**
 * Unit tests for the in-memory rate limiter used in authentication flows.
 *
 * This limiter protects sensitive endpoints (login, forgot-password, etc.)
 * against brute force and abuse by tracking failed attempts per key.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimiter, RATE_LIMIT } from '@/server/modules/auth/services/rate-limiter';

/**
 * Tests for the rateLimiter utility.
 *
 * Covers threshold behavior, lockout timing, reset logic, and key isolation.
 */
describe('rateLimiter', () => {
  let key: string;

  beforeEach(() => {
    // Unique key per test to avoid shared in-memory store contamination
    key = `test-${Math.random()}`;
  });

  /**
   * Purpose: A fresh key with no recorded failures should always be allowed.
   */
  it('should allow when no attempts recorded', () => {
    expect(rateLimiter.check(key)).toBeNull();
  });

  it('should allow under the max attempts threshold', () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS - 1; i += 1) {
      rateLimiter.recordFailure(key);
    }
    expect(rateLimiter.check(key)).toBeNull();
  });

  /**
   * Purpose: After reaching MAX_ATTEMPTS, the limiter should return a positive retryAfter value within the configured lockout window.
   */
  it('should lock out after max attempts', () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i += 1) {
      rateLimiter.recordFailure(key);
    }
    const retryAfter = rateLimiter.check(key);
    expect(retryAfter).not.toBeNull();
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(RATE_LIMIT.LOCKOUT_MS);
  });

  /**
   * Purpose: Calling reset() should clear previous failures so the key is allowed again immediately.
   */
  it('should reset attempts on success', () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i += 1) {
      rateLimiter.recordFailure(key);
    }
    expect(rateLimiter.check(key)).not.toBeNull();

    rateLimiter.reset(key);
    expect(rateLimiter.check(key)).toBeNull();
  });

  it('should track keys independently', () => {
    const otherKey = `other-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i += 1) {
      rateLimiter.recordFailure(key);
    }
    expect(rateLimiter.check(key)).not.toBeNull();
    expect(rateLimiter.check(otherKey)).toBeNull();
  });
});
