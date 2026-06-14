import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the teams module.
 *
 * @example
 * ```ts
 * // Invalidate a specific team's members
 * queryClient.invalidateQueries({ queryKey: teamKeys.members('tm_01') });
 * ```
 */
export const teamKeys = {
  /** Root key — invalidates all team queries. */
  all: ['teams'] as const,
  /** Key for the teams list. */
  list: (params?: ListParams) => [...teamKeys.all, 'list', params] as const,
  /** Key for a single team detail. */
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
  /** Key for team members. */
  members: (id: string) => [...teamKeys.all, 'members', id] as const,
};
