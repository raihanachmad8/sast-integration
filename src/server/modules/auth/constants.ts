export const AUTH = {
  SALT_ROUNDS: 12,
  COOKIE: {
    REFRESH_TOKEN: 'refresh_token',
    MAX_AGE: 7 * 24 * 60 * 60,
    PATH: '/',
    SAME_SITE: 'lax',
  },
  /** Server-side session lifetime in milliseconds (matches cookie MAX_AGE). */
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  ERROR_CODE: {
    AUTH: 'AUTH_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
  },
  ERRORS: {
    REGISTRATION_DISABLED: 'Registration is disabled. Use invitation link.',
    // We no longer use this specific message to avoid user enumeration.
    // See auth.service.ts signup() for the current neutral handling.
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
    RATE_LIMITED: 'Too many failed attempts. Please try again later.',
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

  /** Refresh token rotation & CSRF protection constants */
  REFRESH: {
    /**
     * Custom header that must be sent when calling the refresh endpoint.
     * This provides basic CSRF protection for the cookie-based refresh flow.
     * The value is checked strictly on the server.
     */
    CSRF_HEADER: 'x-refresh-request',
    CSRF_HEADER_VALUE: '1',
  },
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
