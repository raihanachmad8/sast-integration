/** Mail module constants — providers, token expiry, rate limits, messages */
export const MAIL = {
  PROVIDER: {
    SMTP: 'smtp',
    CONSOLE: 'console',
  },
  TOKEN_EXPIRY: {
    /** Password reset token validity: 1 hour */
    PASSWORD_RESET: 60 * 60 * 1000,
    /** Email verification token validity: 24 hours */
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  },
  RATE_LIMIT: {
    /** Minimum interval between reset/verify emails per user: 5 minutes */
    RESET_COOLDOWN_MS: 5 * 60 * 1000,
  },
  MESSAGES: {
    RESET_SENT: 'Password reset email sent',
    RESET_SUCCESS: 'Password reset successful',
    VERIFY_SUCCESS: 'Email verified successfully',
    VERIFY_SENT: 'Verification email sent',
    TOKEN_EXPIRED: 'Token expired or invalid',
    TOKEN_ALREADY_USED: 'Token already used',
    RATE_LIMITED: 'Please wait before requesting another email',
    EMAIL_ALREADY_VERIFIED: 'Email already verified',
  },
  ERROR_CODE: 'AUTH_ERROR',
} as const;
