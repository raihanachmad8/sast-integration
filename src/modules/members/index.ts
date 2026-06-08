/**
 * Members module — workspace member management and invitations.
 *
 * @module members
 *
 * @example
 * ```ts
 * import { useMembersQuery, useInviteMemberMutation } from '@/modules/members';
 * import type { Member, Invitation } from '@/modules/members';
 * ```
 */
export {
  useMembersQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useInvitationsQuery,
  useInviteMemberMutation,
  useRevokeInvitationMutation,
} from './queries';
export type { Member, Invitation } from './api';
