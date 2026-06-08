import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the workspace module.
 *
 * @example
 * ```ts
 * // Invalidate all workspace queries
 * queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
 *
 * // Invalidate a specific workspace detail
 * queryClient.invalidateQueries({ queryKey: workspaceKeys.detail('ws_01') });
 * ```
 */
export const workspaceKeys = {
  /** Root key — invalidates all workspace queries. */
  all: ['workspaces'] as const,
  /** Key for the workspace list. */
  list: (params?: ListParams) => [...workspaceKeys.all, 'list', params] as const,
  /** Key for a single workspace detail. */
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};
