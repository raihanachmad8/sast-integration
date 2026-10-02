import type { Team, TeamMember } from '@/commons/types';

/** Team form input — used by create/edit forms. */
export interface TeamFormInput {
  name: string;
  slug: string;
  description: string;
  memberIds: string[];
}

/** Payload for creating a new team. */
export type CreateTeamPayload = TeamFormInput;

/** Payload for updating an existing team. */
export type UpdateTeamPayload = Partial<TeamFormInput>;
