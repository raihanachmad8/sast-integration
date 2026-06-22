export const PROJECT = {
  ERRORS: {
    NOT_FOUND: 'Project not found',
    NOT_OWNER: 'Only project owner can perform this action',
    NOT_MEMBER: 'You are not a member of this project',
    SLUG_CONFLICT: 'Project slug already exists in this workspace',
    WORKSPACE_REQUIRED: 'Workspace ID is required',
    INSUFFICIENT_ROLE: 'Insufficient permissions for this action',
    TOKEN_NOT_FOUND: 'Project API token not found',
    TOKEN_INVALID: 'Project API token is invalid or has been revoked',
  },
  MESSAGES: {
    CREATED: 'Project created',
    UPDATED: 'Project updated',
    DELETED: 'Project deleted',
    LIST: 'Projects retrieved',
    DETAIL: 'Project retrieved',
  },
  ERROR_CODE: 'PROJECT_ERROR',
  MAX_SLUG_LENGTH: 255,
} as const;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const REPOSITORY_CONNECTION_TYPES = {
  SCM: 'scm',
  EXTERNAL: 'external',
} as const;

export type RepositoryConnectionType = typeof REPOSITORY_CONNECTION_TYPES[keyof typeof REPOSITORY_CONNECTION_TYPES];

export function hasScmConnection(connectionType: string[] | null): boolean {
  return connectionType?.includes(REPOSITORY_CONNECTION_TYPES.SCM) ?? false;
}

export function hasExternalConnection(connectionType: string[] | null): boolean {
  return connectionType?.includes(REPOSITORY_CONNECTION_TYPES.EXTERNAL) ?? false;
}
