import { describe, it, expect } from 'vitest';
import { ROLE } from '@/commons/constants/permissions';
import { INVITATION } from '@/server/modules/invitations/constants';
import { assertCanManageInvitations } from '@/server/modules/invitations/services/invitation.validators';

/**
 * Unit tests for invitation service validators.
 *
 * These validators enforce workspace invitation business rules.
 */

describe('assertCanManageInvitations', () => {
  /**
   * Purpose: Allows owners to manage invitations.
   */
  it('should not throw when actor is owner', () => {
    expect(() => assertCanManageInvitations(ROLE.OWNER)).not.toThrow();
  });

  /**
   * Purpose: Allows managers to manage invitations.
   */
  it('should not throw when actor is manager', () => {
    expect(() => assertCanManageInvitations(ROLE.MANAGER)).not.toThrow();
  });

  /**
   * Purpose: Prevents non-manager/non-owner actors from managing invitations.
   */
  it('should throw for reviewer or member actors', () => {
    expect(() => assertCanManageInvitations(ROLE.REVIEWER)).toThrow(
      'Insufficient permissions to manage invitations',
    );
    expect(() => assertCanManageInvitations(ROLE.MEMBER)).toThrow(
      'Insufficient permissions to manage invitations',
    );
  });

  /**
   * Purpose: Rejects unauthenticated or non-workspace actors.
   */
  it('should throw when actor role is missing', () => {
    expect(() => assertCanManageInvitations(null)).toThrow(
      'Insufficient permissions to manage invitations',
    );
  });

  /**
   * Purpose: Returns the invitation module error code for consistent handling.
   */
  it('should throw an AppError with INVITATION error code', () => {
    try {
      assertCanManageInvitations(null);
    } catch (error) {
      expect(error).toMatchObject({
        code: INVITATION.ERROR_CODE,
        statusCode: 403,
      });
    }
  });
});
