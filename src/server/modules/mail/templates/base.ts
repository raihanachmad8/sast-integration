export interface BaseTemplateOptions {
  title: string;
  preheader?: string;
  brandColor?: string;
  footerText?: string;
}

const DEFAULT_OPTIONS: Required<BaseTemplateOptions> = {
  title: 'SAST Integration',
  preheader: '',
  brandColor: '#0f766e',
  footerText: 'SAST Integration — Static Application Security Testing Platform',
};

/**
 * Reusable email layout wrapper.
 * Every email template wraps its content in this base layout.
 *
 * @param content - Inner HTML body content
 * @param overrides - Optional overrides for title, brand color, etc.
 * @returns Full HTML email string
 */
export function baseLayout(content: string, overrides?: Partial<BaseTemplateOptions>): string {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${opts.brandColor};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">SAST Integration</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999999;">${escapeHtml(opts.footerText)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Reusable CTA button for emails.
 *
 * @param url - Button link URL
 * @param label - Button text
 * @param color - Button background color (defaults to brand blue)
 */
export function ctaButton(url: string, label: string, color?: string): string {
  const bg = color ?? '#0f766e';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border-radius:8px;background-color:${bg};">
        <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

/**
 * Reusable info box for highlighting key details.
 *
 * @param label - Box label (e.g., "Role", "Workspace")
 * @param value - Box value
 * @param color - Accent color (defaults to brand blue)
 */
export function infoBox(label: string, value: string, color?: string): string {
  const accent = color ?? '#0f766e';
  return `<div style="margin:16px 0;padding:12px 16px;background-color:#f8fafc;border-left:3px solid ${accent};border-radius:0 6px 6px 0;">
    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(label)}</p>
    <p style="margin:4px 0 0;font-size:14px;color:#1e293b;font-weight:500;">${escapeHtml(value)}</p>
  </div>`;
}

/**
 * Simple text paragraph helper.
 */
export function paragraph(text: string, style?: string): string {
  const s = style ?? 'margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;';
  return `<p style="${s}">${escapeHtml(text)}</p>`;
}

/**
 * HTML-escape a string for safe embedding in email HTML.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
