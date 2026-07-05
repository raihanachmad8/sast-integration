import { describe, it, expect } from 'vitest';
import { ROLE } from '@/commons/constants/permissions';
import { MEMBER } from '@/server/modules/members/constants';
import {
  assertCanChangeRole,
  assertCanRemoveMember,
  assertValidRole,
} from '@/server/modules/members/services/member.validators';

/**
 * Unit tests for member service validators.
 *
 * These validators enforce workspace member business rules.
 * They are pure functions that throw AppError on violation.
 */

describe('assertValidRole', () => {
  /**
   * Purpose: Accepts all valid workspace role values.
   */
  it('should not throw for valid roles', () => {
    expect(() => assertValidRole(ROLE.OWNER)).not.toThrow();
    expect(() => assertValidRole(ROLE.MANAGER)).not.toThrow();
    expect(() => assertValidRole(ROLE.REVIEWER)).not.toThrow();
    expect(() => assertValidRole(ROLE.MEMBER)).not.toThrow();
  });

  /**
   * Purpose: Rejects unknown role values before any DB query.
   */
  it('should throw an error for invalid role values', () => {
    expect(() => assertValidRole('admin')).toThrow('Invalid role');
  });
});

describe('assertCanChangeRole', () => {
  /**
   * Purpose: Allows owners to change any non-owner member's role.
   */
  it('should allow owner to change a member role', () => {
    expect(() =>
      assertCanChangeRole(ROLE.OWNER, ROLE.MEMBER, ROLE.REVIEWER),
    ).not.toThrow();
  });

  /**
   * Purpose: Prevents changing the owner role.
   */
  it('should throw CANNOT_CHANGE_OWNER_ROLE when target is owner', () => {
    expect(() =>
      assertCanChangeRole(ROLE.OWNER, ROLE.OWNER, ROLE.MANAGER),
    ).toThrow(MEMBER.ERRORS.CANNOT_CHANGE_OWNER_ROLE);
  });

  /**
   * Purpose: Allows managers to downgrade or assign reviewer/member roles.
   */
  it('should allow manager to change a member role to reviewer', () => {
    expect(() =>
      assertCanChangeRole(ROLE.MANAGER, ROLE.MEMBER, ROLE.REVIEWER),
    ).not.toThrow();
  });

  /**
   * Purpose: Prevents managers from assigning the manager role.
   */
  it('should throw MANAGER_RESTRICTED_ROLE when manager assigns manager role', () => {
    expect(() =>
      assertCanChangeRole(ROLE.MANAGER, ROLE.MEMBER, ROLE.MANAGER),
    ).toThrow(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE);
  });

  /**
   * Purpose: Prevents managers from changing another manager's role.
   */
  it('should throw MANAGER_CANNOT_CHANGE_MANAGER when manager targets another manager', () => {
    expect(() =>
      assertCanChangeRole(ROLE.MANAGER, ROLE.MANAGER, ROLE.MEMBER),
    ).toThrow(MEMBER.ERRORS.MANAGER_CANNOT_CHANGE_MANAGER);
  });

  /**
   * Purpose: Returns 403 when actor is not a workspace member.
   */
  it('should throw MEMBER_NOT_FOUND with 403 when actor role is missing', () => {
    expect(() =>
      assertCanChangeRole(null, ROLE.MEMBER, ROLE.REVIEWER),
    ).toThrow(MEMBER.ERRORS.MEMBER_NOT_FOUND);
  });

  /**
   * Purpose: Returns 404 when target member does not exist.
   */
  it('should throw MEMBER_NOT_FOUND with 404 when target role is missing', () => {
    expect(() =>
      assertCanChangeRole(ROLE.OWNER, null, ROLE.REVIEWER),
    ).toThrow(MEMBER.ERRORS.MEMBER_NOT_FOUND);
  });

  /**
   * Purpose: Prevents non-manager/non-owner actors from changing roles.
   */
  it('should throw MANAGER_RESTRICTED_ROLE for reviewer or member actors', () => {
    expect(() =>
      assertCanChangeRole(ROLE.REVIEWER, ROLE.MEMBER, ROLE.MANAGER),
    ).toThrow(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE);
    expect(() =>
      assertCanChangeRole(ROLE.MEMBER, ROLE.MEMBER, ROLE.REVIEWER),
    ).toThrow(MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE);
  });
});

describe('assertCanRemoveMember', () => {
  /**
   * Purpose: Allows owners to remove non-owner members.
   */
  it('should allow owner to remove a member', () => {
    expect(() => assertCanRemoveMember(ROLE.OWNER, ROLE.MEMBER)).not.toThrow();
  });

  /**
   * Purpose: Prevents removing the workspace owner.
   */
  it('should throw CANNOT_REMOVE_OWNER when target is owner', () => {
    expect(() => assertCanRemoveMember(ROLE.OWNER, ROLE.OWNER)).toThrow(
      MEMBER.ERRORS.CANNOT_REMOVE_OWNER,
    );
  });

  /**
   * Purpose: Allows managers to remove regular members or reviewers.
   */
  it('should allow manager to remove a reviewer', () => {
    expect(() => assertCanRemoveMember(ROLE.MANAGER, ROLE.REVIEWER)).not.toThrow();
  });

  /**
   * Purpose: Prevents managers from removing other managers.
   */
  it('should throw MANAGER_CANNOT_REMOVE_MANAGER when manager targets another manager', () => {
    expect(() => assertCanRemoveMember(ROLE.MANAGER, ROLE.MANAGER)).toThrow(
      MEMBER.ERRORS.MANAGER_CANNOT_REMOVE_MANAGER,
    );
  });

  /**
   * Purpose: Returns 403 when actor is not a workspace member.
   */
  it('should throw MEMBER_NOT_FOUND with 403 when actor role is missing', () => {
    expect(() => assertCanRemoveMember(null, ROLE.MEMBER)).toThrow(
      MEMBER.ERRORS.MEMBER_NOT_FOUND,
    );
  });

  /**
   * Purpose: Returns 404 when target member does not exist.
   */
  it('should throw MEMBER_NOT_FOUND with 404 when target role is missing', () => {
    expect(() => assertCanRemoveMember(ROLE.OWNER, null)).toThrow(
      MEMBER.ERRORS.MEMBER_NOT_FOUND,
    );
  });

  /**
   * Purpose: Prevents non-manager/non-owner actors from removing members.
   */
  it('should throw MANAGER_RESTRICTED_ROLE for reviewer or member actors', () => {
    expect(() => assertCanRemoveMember(ROLE.REVIEWER, ROLE.MEMBER)).toThrow(
      MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE,
    );
    expect(() => assertCanRemoveMember(ROLE.MEMBER, ROLE.MEMBER)).toThrow(
      MEMBER.ERRORS.MANAGER_RESTRICTED_ROLE,
    );
  });
});
