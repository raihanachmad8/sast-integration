/**
 * TanStack Query key factory for the project module.
 *
 * Keys are workspace-scoped since each workspace has its own project list.
 */
export const projectKeys = {
  /** Root key — invalidates all project queries. */
  all: ['projects'] as const,
  /** Key for the projects list (workspace-scoped). */
  list: (workspaceId: string, params?: Record<string, unknown>) =>
    [...projectKeys.all, 'list', workspaceId, params] as const,
  /** Key for a single project detail. */
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};
