/**
 * TanStack Query key factory for the invitations module.
 *
 * Keys are workspace-scoped since each workspace has its own invitation list.
 */
export const invitationKeys = {
  /** Root key — invalidates all invitation queries. */
  all: ['invitations'] as const,
  /** Key for the invitation list (workspace-scoped, includes params). */
  list: (workspaceId: string, params?: Record<string, unknown>) =>
    [...invitationKeys.all, 'list', workspaceId, params] as const,
  /** Key for invitation list with filters — uses staleTime: 0 for fresh data. */

};
