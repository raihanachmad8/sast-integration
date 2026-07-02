import { APP_BASE_URL } from '@/commons/constants/app';

import type { SetupGuide } from './SetupGuideDrawer';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

export const GITEA_GUIDE: SetupGuide = {
  title: 'Gitea setup',
  docsUrl: 'https://docs.gitea.com/usage/integrations/gitea',
  modes: [
    { key: 'oauth', label: 'OAuth Application', desc: 'Recommended — OAuth flow with callback' },
    { key: 'pat', label: 'Access Token', desc: 'Quick — create a personal access token' },
  ],
  steps: {
    oauth: [
      {
        label: 'Create an OAuth application',
        detail: 'In Gitea, go to Site Administration → Applications → Create a new OAuth Application.',
        link: { label: 'Open Gitea Admin →', url: 'http://localhost:4000/-/admin/applications' },
        checks: ['Name set (e.g. sast-integration)', 'Confidential client enabled'],
      },
      {
        label: 'Set redirect URI',
        detail: 'Paste this exact value into the Redirect URI field:',
        copyFields: [{ label: 'Redirect URI', value: cbUrl('gitea') }],
        checks: ['Redirect URI pasted'],
      },
      {
        label: 'Save and copy credentials',
        detail: 'Click Create Application. Copy the Client ID and Client Secret.',
        checks: ['Client ID copied', 'Client Secret copied'],
      },
      {
        label: 'Paste credentials in SAST',
        detail: 'Click Configure on the Gitea card, select OAuth, and fill in Client ID, Client Secret, and Base URL.',
        checks: ['Client ID entered', 'Client Secret entered', 'Base URL set'],
      },
    ],
    pat: [
      {
        label: 'Open Access Token settings',
        detail: 'In Gitea, navigate to User Settings → Applications → Manage Access Tokens.',
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
        checks: [
          'user: Read — list your repositories',
          'repository: Read and Write — read code, setup webhooks',
          'issue: Read and Write — post PR comments and commit statuses',
        ],
      },
      {
        label: 'Paste credentials in SAST',
        detail: 'Copy the generated token immediately (shown only once). Click Configure on the Gitea card and paste the token along with your Gitea Base URL.',
        checks: ['Token copied', 'Base URL set', 'Token pasted in Configure modal'],
      },
    ],
  },
};
