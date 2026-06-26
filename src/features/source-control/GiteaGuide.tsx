import type { SetupGuide } from './SetupGuideDrawer';

/**
 * Step-by-step setup guide for connecting Gitea via personal access token.
 *
 * @returns {@link SetupGuide} configuration object for the Gitea provider.
 *
 * @example
 * // Used internally by SetupGuideDrawer
 * const guide = GITEA_GUIDE;
 */
export const GITEA_GUIDE: SetupGuide = {
  title: 'Gitea setup',
  docsUrl: 'https://docs.gitea.com/usage/integrations/gitea',
  modes: [
    { key: 'pat', label: 'Access Token', desc: 'Quick setup — create a personal access token in Gitea' },
  ],
  steps: {
    pat: [
      {
        label: 'Open Access Token settings',
        detail: 'Go to Gitea → User Settings → Applications → Manage Access Tokens → Generate New Token.',
        link: { label: 'Open Gitea Settings →', url: 'http://localhost:4000/user/settings/applications' },
        checks: ['Logged in to Gitea'],
      },
      {
        label: 'Generate token with required scopes',
        detail: 'Set a token name and select the required scopes below. Click Generate Token.',
        checks: ['Token name set', 'Correct scopes selected'],
      },
      {
        label: 'Required token scopes',
        detail: 'Select only the scopes needed for SAST integration. Minimal permissions reduce security risk.',
        checks: ['user: Read — required to list your repositories', 'repository: Read and Write — read code, setup webhooks', 'issue: Read and Write — post quality gate comments on PRs'],
      },
      {
        label: 'Configure in SAST Integration',
        detail: 'Copy the generated token immediately (shown only once). Click Configure on the Gitea card and paste the token along with your Gitea Base URL.',
        checks: ['Token copied', 'Base URL set', 'Token pasted in Configure modal'],
      },
    ],
  },
};
