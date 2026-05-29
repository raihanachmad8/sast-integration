/** Workspace module constants */
export const WORKSPACE = {
  TYPE: {
    PERSONAL: 'personal',
    ORGANIZATION: 'organization',
  },
  ERRORS: {
    NOT_FOUND: 'Workspace not found',
    NOT_OWNER: 'Only workspace owner can perform this action',
    NOT_MEMBER: 'You are not a member of this workspace',
    CANNOT_DELETE_PERSONAL: 'Personal workspace cannot be deleted',
    SLUG_CONFLICT: 'Workspace slug already exists',
    WORKSPACE_REQUIRED: 'Workspace ID is required',
  },
  MESSAGES: {
    CREATED: 'Workspace created',
    UPDATED: 'Workspace updated',
    DELETED: 'Workspace deleted',
    LIST: 'Workspaces retrieved',
    DETAIL: 'Workspace retrieved',
    SWITCHED: 'Workspace switched',
  },
  ERROR_CODE: 'WORKSPACE_ERROR',
} as const;
