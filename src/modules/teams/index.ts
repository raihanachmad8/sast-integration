/**
 * Teams module — team CRUD and member management.
 *
 * @module teams
 *
 * @example
 * ```ts
 * import { teamsApi, useTeamsQuery, useCreateTeamMutation } from '@/modules/teams';
 * import type { TeamFormInput } from '@/modules/teams';
 * ```
 */
export { teamsApi } from './api';
export { teamKeys } from './keys';
export {
  useTeamsQuery,
  useTeamQuery,
  useTeamMembersQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
} from './queries';
export type { TeamFormInput } from './types';
