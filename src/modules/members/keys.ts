/**
 * TanStack Query key factory for the members module.
 *
 * Keys are workspace-scoped since each workspace has its own member list.
 */
export const memberKeys = {
  /** Root key — invalidates all member queries. */
  all: ['members'] as const,
  /** Key for the member list (workspace-scoped, includes params). */
  list: (workspaceId: string, params?: Record<string, unknown>) =>
    [...memberKeys.all, 'list', workspaceId, params] as const,
  /** Key for member list with filters — uses staleTime: 0 for fresh data. */
  listFilter: (workspaceId: string, params?: Record<string, unknown>) =>
    [...memberKeys.all, 'list-filter', workspaceId, params] as const,
};
