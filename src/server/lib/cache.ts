import { unstable_cache as nextCache } from 'next/cache';
import { logger } from '@/server/lib/logger';

const isDev = process.env.NODE_ENV === 'development';

type CacheOptions = {
  /** Cache key segments appended after the base key. */
  keyPrefix?: string;
  /** Revalidation interval in seconds. Default: 300 (5 min). */
  revalidate?: number;
  /** Next.js tag(s) for on-demand revalidation via `revalidateTag()`. */
  tags?: string[];
};

/**
 * Thin wrapper around `next/cache`'s `unstable_cache`.
 *
 * Provides:
 * - Consistent logging in dev
 * - Easy tag-based revalidation
 * - Type-safe caching for async functions
 *
 * @example
 * ```ts
 * const getCachedStats = createCache(dashboardService.getStats, {
 *   keyPrefix: 'dashboard:stats',
 *   revalidate: 30,
 *   tags: ['dashboard'],
 * });
 *
 * // Usage (same signature as original function)
 * const stats = await getCachedStats(workspaceId);
 * ```
 */
export function createCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: CacheOptions = {},
) {
  const { keyPrefix = fn.name || 'cached', revalidate = 300, tags = [] } = options;

  const cachedFn = nextCache(
    async (...args: TArgs) => {
      if (isDev) {
        logger.scan.debug(`[cache] miss: ${keyPrefix}`, { args: args.map(String) });
      }
      return fn(...args);
    },
    [keyPrefix],
    { revalidate, tags },
  );

  return async (...args: TArgs): Promise<TReturn> => {
    return cachedFn(...args);
  };
}

/**
 * Invalidate all cache entries matching the given tag.
 * Call after mutations that should bust the cache.
 *
 * @example
 * ```ts
 * import { revalidateTag } from 'next/cache';
 * revalidateTag('quality-gates');
 * ```
 */
export { revalidateTag } from 'next/cache';
