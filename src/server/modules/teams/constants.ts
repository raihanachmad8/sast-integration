/** Team module constants */
export const TEAM = {
  ERRORS: {
    NOT_FOUND: 'Team not found',
    NOT_MEMBER: 'You are not a member of this workspace',
    SLUG_CONFLICT: 'Team slug already exists in this workspace',
    WORKSPACE_REQUIRED: 'Workspace ID is required',
    INSUFFICIENT_ROLE: 'Insufficient permissions for this action',
  },
  MESSAGES: {
    CREATED: 'Team created',
    UPDATED: 'Team updated',
    DELETED: 'Team deleted',
    LIST: 'Teams retrieved',
    DETAIL: 'Team retrieved',
  },
  ERROR_CODE: 'TEAM_ERROR',
  /** Maximum length for team slugs */
  MAX_SLUG_LENGTH: 255,
} as const;
