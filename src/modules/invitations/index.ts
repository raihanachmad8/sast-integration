/**
 * Invitations module — workspace invitation management.
 *
 * @module invitations
 *
 * @example
 * ```ts
 * import { invitationsApi, useInvitationsQuery, invitationKeys } from '@/modules/invitations';
 * import type { Invitation } from '@/modules/invitations';
 * ```
 */
export { invitationsApi } from './api';
export { invitationKeys } from './keys';
export {
  useInvitationsQuery,
  useInviteMemberMutation,
  useRevokeInvitationMutation,
} from './queries';
export type { Invitation } from './api';
