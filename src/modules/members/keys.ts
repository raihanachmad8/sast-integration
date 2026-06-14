/**
 * TanStack Query key factory for the members module.
 *
 * Keys are workspace-scoped since each workspace has its own member list.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: memberKeys.list('ws_01') });
 * queryClient.invalidateQueries({ queryKey: memberKeys.invitations('ws_01') });
 * ```
 */
export const memberKeys = {
  /** Root key — invalidates all member queries. */
  all: ['members'] as const,
  /** Key for the member list (workspace-scoped, includes params). */
  list: (workspaceId: string, params?: import('@/commons/types/pagination').ListParams) => [...memberKeys.all, 'list', workspaceId, params] as const,
  /** Key for pending invitations (workspace-scoped, includes params). */
  invitations: (workspaceId: string, params?: import('@/commons/types/pagination').ListParams) => [...memberKeys.all, 'invitations', workspaceId, params] as const,
};
