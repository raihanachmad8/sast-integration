export const MAIL = {
  PROVIDER: {
    SMTP: 'smtp',
    CONSOLE: 'console',
  },
  TOKEN_EXPIRY: {
    PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  },
  RATE_LIMIT: {
    RESET_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes
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
