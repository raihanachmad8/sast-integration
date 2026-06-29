/** Invitations module constants */
export const INVITATION = {
  ERRORS: {
    INVITATION_NOT_FOUND: 'Invitation not found',
    ALREADY_MEMBER: 'This user is already a member of this workspace',
  },
  MESSAGES: {
    INVITATIONS_LIST: 'Invitations retrieved',
    INVITATION_CREATED: 'Invitation created',
    INVITATION_REVOKED: 'Invitation revoked',
  },
  ERROR_CODE: 'INVITATION_ERROR',
  INVITE_TOKEN_BYTES: 32,
} as const;
