/** Mail module constants — providers, token expiry, rate limits, messages, theme */
export const MAIL = {
  PROVIDER: {
    SMTP: 'smtp',
    CONSOLE: 'console',
    // TODO: RESEND: 'resend' — add Resend API transport when needed
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
  SUBJECTS: {
    RESET_PASSWORD: 'Reset your password',
    VERIFY_EMAIL: 'Verify your email',
    WORKSPACE_INVITE: 'You have been invited to a workspace',
  },
  TEMPLATES: {
    RESET_CTA: 'Reset Password',
    VERIFY_CTA: 'Verify Email',
    RESET_EXPIRY: 'This link expires in 1 hour. If you did not request this, ignore this email.',
    VERIFY_EXPIRY: 'This link expires in 24 hours.',
  },
  /** Email template inline styles (email clients don't support CSS vars) */
  THEME: {
    BG: '#f8fafc',
    CARD_BG: '#ffffff',
    CARD_BORDER: '#e2e8f0',
    TEXT: '#1e293b',
    TEXT_MUTED: '#64748b',
    TEXT_FOOTER: '#94a3b8',
  },
  ERROR_CODE: 'AUTH_ERROR',
} as const;
