import type { FindingListParams } from './types';

/**
 * TanStack Query key factory for the findings module.
 *
 * @example
 * ```ts
 * // Invalidate all finding queries
 * queryClient.invalidateQueries({ queryKey: findingKeys.all });
 *
 * // Invalidate the findings list with specific params
 * queryClient.invalidateQueries({ queryKey: findingKeys.list(params) });
 * ```
 */
export const findingKeys = {
  /** Root key — invalidates all finding-related queries. */
  all: ['findings'] as const,
  /** Key for the findings list (includes params for cache differentiation). */
  list: (params?: FindingListParams) => [...findingKeys.all, 'list', params] as const,
  /** Key for a single finding detail. */
  detail: (id: string) => [...findingKeys.all, 'detail', id] as const,
  /** Key for finding groups under a project. */
  groups: (projectId: string) => [...findingKeys.all, 'groups', projectId] as const,
};
