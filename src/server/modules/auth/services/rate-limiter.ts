/**
 * In-memory rate limiter for auth endpoints.
 * Tracks failed attempts per key (email/IP) with sliding window.
 * Suitable for single-instance deployments (thesis scope).
 *
 * Disable for testing: set RATE_LIMIT_ENABLED=false in .env
 */

import { logger } from '@/server/lib/logger';

let _rateLimitEnabled: boolean | null = null;

function isRateLimitEnabled(): boolean {
  if (_rateLimitEnabled !== null) return _rateLimitEnabled;
  const raw = process.env.RATE_LIMIT_ENABLED;
  _rateLimitEnabled = raw !== 'false';
  return _rateLimitEnabled;
}

const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes
} as const;

export { RATE_LIMIT };

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const store = new Map<string, AttemptRecord>();

/** Periodically clean expired entries (every 5 minutes). */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    const windowExpired = now - record.firstAttempt > RATE_LIMIT.WINDOW_MS;
    const lockExpired = record.lockedUntil && now > record.lockedUntil;
    if (windowExpired && (!record.lockedUntil || lockExpired)) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

export const rateLimiter = {
  /**
   * Check if a key is currently rate-limited.
   * @returns `null` if allowed, or `retryAfterMs` if blocked.
   */
  check(key: string): number | null {
    if (!isRateLimitEnabled()) return null;

    const record = store.get(key);
    if (!record) return null;

    const now = Date.now();

    // Locked out
    if (record.lockedUntil) {
      if (now < record.lockedUntil) {
        logger.auth.warn('Rate limit: locked out', { key, remainingMs: record.lockedUntil - now });
        return record.lockedUntil - now;
      }
      // Lock expired — reset
      store.delete(key);
      return null;
    }

    // Window expired — reset
    if (now - record.firstAttempt > RATE_LIMIT.WINDOW_MS) {
      store.delete(key);
      return null;
    }

    return null;
  },

  /**
   * Record a failed attempt. Locks out after MAX_ATTEMPTS.
   */
  recordFailure(key: string): void {
    if (!isRateLimitEnabled()) return;

    const now = Date.now();
    const record = store.get(key);

    if (!record || now - record.firstAttempt > RATE_LIMIT.WINDOW_MS) {
      store.set(key, { count: 1, firstAttempt: now, lockedUntil: null });
      return;
    }

    record.count += 1;
    if (record.count >= RATE_LIMIT.MAX_ATTEMPTS) {
      record.lockedUntil = now + RATE_LIMIT.LOCKOUT_MS;
      logger.auth.warn('Rate limit: max attempts reached, locked out', { key, attempts: record.count });
    }
  },

  /** Clear attempts for a key (e.g., on successful login). */
  reset(key: string): void {
    store.delete(key);
  },
};
