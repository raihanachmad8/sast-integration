import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

import { INVITATION } from '../constants';

/**
 * Assert that an actor is allowed to manage workspace invitations.
 * Purpose: Enforce owner/manager permission for invite/revoke operations.
 */
export function assertCanManageInvitations(actorRole: string | null): void {
  if (!actorRole || (actorRole !== ROLE.OWNER && actorRole !== ROLE.MANAGER)) {
    throw new AppError('Insufficient permissions to manage invitations', 403, INVITATION.ERROR_CODE);
  }
}
