import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the source-control module.
 *
 * @example
 * ```ts
 * // Invalidate all source-control queries
 * queryClient.invalidateQueries({ queryKey: sourceControlKeys.all });
 *
 * // Invalidate a specific provider's repos
 * queryClient.invalidateQueries({ queryKey: sourceControlKeys.repos('sc_01') });
 * ```
 */
export const sourceControlKeys = {
  /** Root key — invalidates all source-control queries. */
  all: ['sourceControls'] as const,
  /** Key for the list of provider connections. */
  providers: () => [...sourceControlKeys.all, 'providers'] as const,
  /** Key for a specific provider. */
  provider: (id: string) => [...sourceControlKeys.all, 'provider', id] as const,
  /** Key for all repos queries (for wildcard invalidation). */
  allRepos: () => [...sourceControlKeys.all, 'repos'] as const,
  /** Key for repositories under a provider (includes params). */
  repos: (providerId: string, params?: ListParams) => [...sourceControlKeys.all, 'repos', providerId, params] as const,
};
