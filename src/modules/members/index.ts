/**
 * Members module — workspace member management.
 *
 * @module members
 *
 * @example
 * ```ts
 * import { membersApi, useMembersQuery, memberKeys } from '@/modules/members';
 * import type { Member } from '@/modules/members';
 * ```
 */
export { membersApi } from './api';
export { memberKeys } from './keys';
export {
  useMembersQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from './queries';
export type { Member } from './api';
