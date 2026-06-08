import { baseLayout, ctaButton, paragraph } from './base';

/**
 * Email verification template.
 *
 * @param name - User's display name
 * @param verifyUrl - URL to verify email (contains token)
 * @returns Full HTML email string
 */
export function verifyEmailTemplate(name: string, verifyUrl: string): string {
  const content = `
    ${paragraph(`Hi ${name},`)}
    ${paragraph('Thanks for signing up! Please verify your email address by clicking the button below.')}
    ${ctaButton(verifyUrl, 'Verify Email')}
    ${paragraph('This link expires in 24 hours.', 'margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;')}
    ${paragraph('If you did not create an account, you can safely ignore this email.', 'margin:8px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;')}
  `;

  return baseLayout(content, {
    title: 'Verify Your Email',
    preheader: 'Click the link to verify your email address.',
  });
}
