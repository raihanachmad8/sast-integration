import { ROLE } from '@/commons/constants/permissions';
import type { Member as ApiMember, Invitation as ApiInvitation } from '@/modules/members/api';

/** Represents a workspace member with their profile and role information. */
export type Member = ApiMember;

/** Represents a pending invitation sent to a user to join the workspace. */
export type Invitation = ApiInvitation;

/** Tab identifier for the members page view. */
export type ActiveTab = 'members' | 'pending';

/**
 * Maps workspace roles to StatusPill variant names.
 * Used to render role badges with consistent color coding.
 */
export const PILL_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'purple' | 'slate'> = {
  [ROLE.OWNER]: 'purple',
  [ROLE.MANAGER]: 'blue',
  [ROLE.REVIEWER]: 'teal',
  [ROLE.MEMBER]: 'slate',
};
