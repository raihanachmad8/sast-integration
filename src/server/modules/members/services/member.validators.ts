import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

import { MEMBER } from '../constants';

type Role = typeof ROLE[keyof typeof ROLE];

const VALID_ROLES: readonly string[] = [ROLE.OWNER, ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER];

/**
 * Assert that the given role is a valid workspace role value.
 * Purpose: Fail fast on invalid input before any DB queries.
 */
export function assertValidRole(role: string): asserts role is Role {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`, 400, MEMBER.ERROR_CODE);
  }
}

/**
 * Assert that an actor is allowed to manage workspace members.
 * Purpose: Enforce the base permission for any member mutation.
 */
export function assertCanManageMembers(actorRole: string | null): void {
  if (!actorRole) {
    throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 403, MEMBER.ERROR_CODE);
  }
  if (actorRole !== ROLE.OWNER && actorRole !== ROLE.MANAGER) {
    throw new AppError(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE, 403, MEMBER.ERROR_CODE);
  }
}

/**
 * Assert that actor is not trying to change their own role.
 */
export function assertNotSelf(targetUserId: string, actorUserId: string, operation: string): void {
  if (targetUserId === actorUserId) {
    throw new AppError(
      operation === 'changeRole' ? MEMBER.ERRORS.CANNOT_CHANGE_OWN_ROLE : MEMBER.ERRORS.CANNOT_REMOVE_SELF,
      403,
      MEMBER.ERROR_CODE,
    );
  }
}

/**
 * Assert that owner role cannot be assigned via API.
 */
export function assertNotAssigningOwner(newRole: string): void {
  if (newRole === ROLE.OWNER) {
    throw new AppError(MEMBER.ERRORS.CANNOT_ASSIGN_OWNER, 403, MEMBER.ERROR_CODE);
  }
}

/**
 * Assert that a role change is allowed between actor and target.
 * Purpose: Centralize all business rules for role transitions in one place.
 */
export function assertCanChangeRole(
  actorRole: string | null,
  targetRole: string | null,
  newRole: string,
): void {
  assertCanManageMembers(actorRole);

  if (actorRole !== ROLE.OWNER && newRole === ROLE.MANAGER) {
    throw new AppError(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE, 403, MEMBER.ERROR_CODE);
  }

  if (!targetRole) {
    throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 404, MEMBER.ERROR_CODE);
  }
  if (targetRole === ROLE.OWNER) {
    throw new AppError(MEMBER.ERRORS.CANNOT_CHANGE_OWNER_ROLE, 403, MEMBER.ERROR_CODE);
  }
  if (actorRole === ROLE.MANAGER && targetRole === ROLE.MANAGER) {
    throw new AppError(MEMBER.ERRORS.MANAGER_CANNOT_CHANGE_MANAGER, 403, MEMBER.ERROR_CODE);
  }
}

/**
 * Assert that a member removal is allowed.
 * Purpose: Centralize business rules for removing workspace members.
 */
export function assertCanRemoveMember(
  actorRole: string | null,
  targetRole: string | null,
): void {
  assertCanManageMembers(actorRole);

  if (!targetRole) {
    throw new AppError(MEMBER.ERRORS.MEMBER_NOT_FOUND, 404, MEMBER.ERROR_CODE);
  }
  if (targetRole === ROLE.OWNER) {
    throw new AppError(MEMBER.ERRORS.CANNOT_REMOVE_OWNER, 403, MEMBER.ERROR_CODE);
  }
  if (actorRole === ROLE.MANAGER && targetRole === ROLE.MANAGER) {
    throw new AppError(MEMBER.ERRORS.MANAGER_CANNOT_REMOVE_MANAGER, 403, MEMBER.ERROR_CODE);
  }
}
