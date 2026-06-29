/**
 * Workspace module — workspace CRUD, switching, and settings.
 *
 * @module workspace
 *
 * @example
 * ```ts
 * import { workspaceApi, useWorkspacesQuery, useSwitchWorkspaceMutation } from '@/modules/workspace';
 * import type { WorkspaceItem } from '@/modules/workspace';
 * ```
 */
export { workspaceApi } from './api';
export { workspaceKeys } from './keys';
export {
  useWorkspacesQuery,
  useCreateWorkspaceMutation,
  useSwitchWorkspaceMutation,
  useWorkspaceDetailQuery,
  useUpdateWorkspaceMutation,
  usePendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from './queries';
export type { WorkspaceItem, PendingInvitation } from './types';
