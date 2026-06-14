import { baseLayout, ctaButton, infoBox, paragraph } from './base';

/**
 * Workspace invitation email template.
 *
 * @param email - Recipient email address
 * @param role - Assigned role (owner, manager, reviewer, member)
 * @param workspaceName - Name of the workspace
 * @param acceptUrl - URL to accept the invitation
 * @returns Full HTML email string
 */
export function workspaceInviteTemplate(
  email: string,
  role: string,
  workspaceName: string,
  acceptUrl: string,
): string {
  const content = `
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">You've been invited to join <strong>${workspaceName}</strong>.</p>
    ${infoBox('Workspace', workspaceName, '#0f766e')}
    ${infoBox('Role', role.charAt(0).toUpperCase() + role.slice(1), '#7c3aed')}
    ${paragraph('Click the button below to accept the invitation and create your account.')}
    ${ctaButton(acceptUrl, 'Accept Invitation')}
    ${paragraph('If you were not expecting this invitation, you can safely ignore this email.', 'margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;')}
  `;

  return baseLayout(content, {
    title: `Invitation to ${workspaceName}`,
    preheader: `You've been invited to join ${workspaceName} as ${role}.`,
  });
}
