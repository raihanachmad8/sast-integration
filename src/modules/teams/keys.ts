/**
 * TanStack Query key factory for the teams module.
 *
 * Keys are workspace-scoped since each workspace has its own team list.
 */
export const teamKeys = {
  /** Root key — invalidates all team queries. */
  all: ['teams'] as const,
  /** Key for the teams list (workspace-scoped). */
  list: (workspaceId: string, params?: Record<string, unknown>) =>
    [...teamKeys.all, 'list', workspaceId, params] as const,
  /** Key for a single team detail. */
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
};
