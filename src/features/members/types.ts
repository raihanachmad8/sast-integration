import { ROLE } from '@/commons/constants/permissions';

/** Represents a workspace member with their profile and role information. */
export interface Member {
  /** Unique identifier for the user. */
  userId: string;
  /** Email address of the member. */
  email: string;
  /** Display name of the member. */
  name: string;
  /** URL to the member's avatar image, or null if none is set. */
  avatarUrl: string | null;
  /** Role assigned to the member within the workspace (e.g., owner, manager, reviewer, member). */
  role: string;
  /** ISO 8601 timestamp of when the member joined the workspace. */
  joinedAt: string;
}

/** Represents a pending invitation sent to a user to join the workspace. */
export interface Invitation {
  /** Unique identifier for the invitation. */
  id: string;
  /** Email address the invitation was sent to. */
  email: string;
  /** Role that will be assigned upon acceptance. */
  role: string;
  /** ISO 8601 timestamp of when the invitation was created. */
  createdAt: string;
  /** ISO 8601 timestamp of when the invitation expires. */
  expiresAt: string;
}

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
