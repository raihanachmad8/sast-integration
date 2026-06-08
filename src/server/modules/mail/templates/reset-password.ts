import { baseLayout, ctaButton, paragraph } from './base';

/**
 * Password reset email template.
 *
 * @param name - User's display name
 * @param resetUrl - URL to reset password (contains token)
 * @returns Full HTML email string
 */
export function resetPasswordTemplate(name: string, resetUrl: string): string {
  const content = `
    ${paragraph(`Hi ${name},`)}
    ${paragraph('We received a request to reset your password. Click the button below to set a new one.')}
    ${ctaButton(resetUrl, 'Reset Password', '#ef4444')}
    ${paragraph('This link expires in 15 minutes.', 'margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;')}
    ${paragraph('If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.', 'margin:8px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;')}
  `;

  return baseLayout(content, {
    title: 'Reset Your Password',
    preheader: 'Click the link to reset your password.',
    brandColor: '#ef4444',
  });
}
