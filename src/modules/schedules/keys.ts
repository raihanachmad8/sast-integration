import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the schedules module.
 *
 * @example
 * ```ts
 * // Invalidate all schedule queries
 * queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
 *
 * // Invalidate the schedules list
 * queryClient.invalidateQueries({ queryKey: scheduleKeys.list() });
 * ```
 */
export const scheduleKeys = {
  /** Root key — invalidates all schedule-related queries. */
  all: ['schedules'] as const,
  /** Key for the schedules list. */
  list: (params?: ListParams) => [...scheduleKeys.all, 'list', params] as const,
};
