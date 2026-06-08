/**
 * Centralized TanStack Query constants — stale times, retry configs, and duration utilities.
 *
 * Use these constants instead of inline numeric values across all query hooks.
 *
 * @example
 * ```ts
 * import { STALE, RETRY } from '@/commons/constants/query';
 *
 * export function useScanListQuery() {
 *   return useQuery({
 *     queryKey: scanKeys.list(),
 *     queryFn: () => scanApi.list(),
 *     staleTime: STALE.SHORT,   // 30s — scans change rapidly
 *   });
 * }
 *
 * export function useSessionQuery() {
 *   return useQuery({
 *     queryKey: authKeys.session(),
 *     queryFn: () => authApi.me(),
 *     staleTime: STALE.DEFAULT, // 5m
 *     retry: RETRY.DISABLED,    // don't retry auth failures
 *   });
 * }
 * ```
 */

/** Stale time durations for TanStack Query's `staleTime` option. */
export const STALE = {
  /**
   * 30 seconds — for rapidly changing data (scans, dashboard stats, notifications).
   * Data is considered stale quickly, so the UI always shows fresh information.
   */
  SHORT: 30_000,

  /**
   * 5 minutes — default for most list/detail queries (projects, teams, findings, repos).
   * Balances freshness with reducing redundant network requests.
   */
  DEFAULT: 5 * 60_000,

  /**
   * 30 minutes — for rarely-changing reference data (AI models, scan profiles, quality gates).
   * Avoids unnecessary refetches for data that changes infrequently.
   */
  LONG: 30 * 60_000,

  /**
   * Infinity — never auto-refresh (config/settings data).
   * Only refetches on explicit invalidation or window focus (if enabled).
   */
  DISABLED: Infinity,
} as const;

/** Retry configuration for TanStack Query's `retry` option. */
export const RETRY = {
  /**
   * Disable retries — for auth and session queries where retrying on 401 is pointless.
   */
  DISABLED: false,

  /**
   * Default retry count (3 attempts) — for general data fetching.
   * Explicit value for clarity; matches TanStack's default.
   */
  DEFAULT: 3,

  /**
   * Aggressive retry (5 attempts) — for critical data that should rarely fail.
   */
  AGGRESSIVE: 5,
} as const;
