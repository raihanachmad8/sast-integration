/**
 * TanStack Query key factory for the API tokens module.
 *
 * Keys are scoped by workspaceId + projectId since tokens are project-scoped.
 */
export const apiTokenKeys = {
  /** Root key — invalidates all API token queries. */
  all: ['apiTokens'] as const,
  /** Key for the token list (workspace + project scoped). */
  list: (workspaceId: string, projectId: string) =>
    [...apiTokenKeys.all, 'list', workspaceId, projectId] as const,
};
