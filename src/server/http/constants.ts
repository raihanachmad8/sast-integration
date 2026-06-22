/** HTTP-level constants shared across all modules */
export const HTTP = {
  HEADERS: {
    AUTHORIZATION: 'authorization',
    WORKSPACE_ID: 'x-workspace-id',
    FORWARDED_FOR: 'x-forwarded-for',
    USER_AGENT: 'user-agent',
    CONTENT_TYPE: 'content-type',
  },
  AUTH_SCHEME: 'Bearer ',
  ERROR_CODES: {
    VALIDATION: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    SCM_ERROR: 'SCM_ERROR',
    INTERNAL: 'INTERNAL_ERROR',
  },
  MESSAGES: {
    VALIDATION_FAILED: 'Validation failed',
    INVALID_BODY: 'Invalid request body',
    NOT_FOUND: 'Not found',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_PER_PAGE: 20,
    DEFAULT_SORT_BY: 'created_at',
    DEFAULT_SORT_ORDER: 'desc' as const,
  },
} as const;

export const JWT_ALGORITHM = 'HS256' as const;
export const TOKEN_BYTES = 32;
