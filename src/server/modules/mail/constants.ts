/**
 * Mail configuration constants — single source of truth.
 * Used by: env validation, mail service, templates.
 */
export const MAIL = {
  PROVIDER: {
    CONSOLE: 'console',
    SMTP: 'smtp',
    RESEND: 'resend',
  },

  SUBJECTS: {
    WORKSPACE_INVITE: 'You\'ve been invited to a workspace',
    RESET_PASSWORD: 'Reset your password',
    VERIFY_EMAIL: 'Verify your email address',
    SCAN_COMPLETE: 'Scan completed',
    REPORT_READY: 'Your report is ready',
    FINDING_ASSIGNED: 'A finding has been assigned to you',
  },

  MESSAGES: {
    RATE_LIMITED: 'Too many requests. Please try again later.',
    TOKEN_EXPIRED: 'Token has expired.',
    TOKEN_ALREADY_USED: 'Token has already been used.',
    EMAIL_ALREADY_VERIFIED: 'Email is already verified.',
    VERIFY_SUCCESS: 'Email verified successfully.',
    VERIFY_SENT: 'Verification email sent.',
    RESET_SUCCESS: 'Password reset successfully.',
    RESET_SENT: 'Password reset email sent.',
  },

  TOKEN_EXPIRY: {
    PASSWORD_RESET: 15 * 60 * 1000, // 15 minutes
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  },

  ERROR_CODE: 'MAIL_ERROR',
} as const;
