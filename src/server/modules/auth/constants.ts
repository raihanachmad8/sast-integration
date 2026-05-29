export const AUTH = {
  SALT_ROUNDS: 12,
  COOKIE: {
    REFRESH_TOKEN: 'refresh_token',
    MAX_AGE: 7 * 24 * 60 * 60,
    PATH: '/api/v1/auth/refresh',
  },
  ERROR_CODE: {
    AUTH: 'AUTH_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
  },
  ERRORS: {
    REGISTRATION_DISABLED: 'Registration is disabled. Use invitation link.',
    EMAIL_EXISTS: 'Email already registered',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_TOKEN: 'Invalid token',
    INVALID_SESSION: 'Invalid session',
    NO_TOKEN: 'No token provided',
    USER_NOT_FOUND: 'User not found',
    INVITE_EXPIRED: 'Invitation expired or invalid',
    INVITE_ALREADY_ACCEPTED: 'Invitation already accepted',
    WORKSPACE_REQUIRED: 'Workspace ID required',
    SIGNOUT_FAILED: 'Signout failed',
  },
  MESSAGES: {
    SIGNUP_SUCCESS: 'Registration successful',
    SIGNIN_SUCCESS: 'Login successful',
    SIGNOUT_SUCCESS: 'Signed out',
    REFRESH_SUCCESS: 'Token refreshed',
    SESSION_RETRIEVED: 'Session retrieved',
    INVITE_SENT: 'Invitation sent',
    INVITE_ACCEPTED: 'Invitation accepted',
  },
  INVITE_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export const WORKSPACE_DEFAULTS = {
  PERSONAL_NAME: 'Personal Workspace',
  PERSONAL_SLUG_PREFIX: 'personal-',
  DEFAULT_SLUG: 'default',
  DEFAULT_NAME: 'Default Workspace',
} as const;

export const NODE_ENV = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const;

export const WORKSPACE_MODE = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
} as const;

export const REGISTRATION_MODE = {
  OPEN: 'open',
  INVITE: 'invite',
} as const;
