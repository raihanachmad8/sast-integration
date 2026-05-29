import { APP_NAME } from '@/commons/constants';
import { AUTH_THEME } from '@/commons/constants';

/**
 * Base email layout wrapper.
 * All emails share consistent branding, typography, and footer.
 * Individual templates only provide the body content.
 *
 * @param content - Inner HTML content for the email body
 * @returns Complete HTML email string
 */
function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 24px">
    <tr><td>
      <!-- Header -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
        <tr>
          <td style="font-size:18px;font-weight:700;color:${AUTH_THEME.PRIMARY}">${APP_NAME}</td>
        </tr>
      </table>
      <!-- Content -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;padding:32px">
        <tr><td style="color:#1e293b;font-size:15px;line-height:1.6">
          ${content}
        </td></tr>
      </table>
      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
        <tr><td style="font-size:12px;color:#94a3b8;text-align:center">
          This email was sent by ${APP_NAME}. If you did not expect this, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * CTA button component for email templates.
 *
 * @param label - Button text
 * @param url - Target URL
 * @returns HTML string for a styled button
 */
function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="background:${AUTH_THEME.PRIMARY};border-radius:6px;padding:12px 28px">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px">${label}</a>
    </td></tr>
  </table>`;
}

/**
 * Password reset email template.
 *
 * @param name - Recipient's display name
 * @param resetUrl - Password reset URL with token
 * @returns Complete HTML email
 */
export function resetPasswordTemplate(name: string, resetUrl: string): string {
  return baseLayout(`
    <p style="margin:0 0 16px">Hi ${name},</p>
    <p style="margin:0 0 8px">You requested a password reset. Click the button below to set a new password:</p>
    ${ctaButton('Reset Password', resetUrl)}
    <p style="margin:0;font-size:13px;color:#64748b">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);
}

/**
 * Email verification template.
 *
 * @param name - Recipient's display name
 * @param verifyUrl - Email verification URL with token
 * @returns Complete HTML email
 */
export function verifyEmailTemplate(name: string, verifyUrl: string): string {
  return baseLayout(`
    <p style="margin:0 0 16px">Hi ${name},</p>
    <p style="margin:0 0 8px">Please verify your email address by clicking the button below:</p>
    ${ctaButton('Verify Email', verifyUrl)}
    <p style="margin:0;font-size:13px;color:#64748b">This link expires in 24 hours.</p>
  `);
}
