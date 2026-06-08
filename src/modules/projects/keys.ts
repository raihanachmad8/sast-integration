import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the project module.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: projectKeys.list() });
 * queryClient.invalidateQueries({ queryKey: projectKeys.detail('proj_01') });
 * queryClient.invalidateQueries({ queryKey: projectKeys.apiTokens('proj_01') });
 * ```
 */
export const projectKeys = {
  /** Root key — invalidates all project queries. */
  all: ['projects'] as const,
  /** Key for the projects list. */
  list: (params?: ListParams) => [...projectKeys.all, 'list', params] as const,
  /** Key for a single project detail. */
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  /** Key for a project's API tokens. */
  apiTokens: (projectId: string) => [...projectKeys.all, 'apiTokens', projectId] as const,
};
