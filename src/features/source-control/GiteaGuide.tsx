import type { SetupGuide } from './SetupGuideDrawer';
import { APP_BASE_URL } from '@/commons/constants/app';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

export const GITEA_GUIDE: SetupGuide = {
  title: 'Gitea setup',
  docsUrl: 'https://docs.gitea.com/development/oauth2-provider',
  modes: [
    { key: 'oauth', label: 'OAuth2 Application', desc: 'Recommended — standard OAuth2 flow' },
    { key: 'pat', label: 'Access Token', desc: 'Quick setup — user-scoped token' },
  ],
  steps: {
    oauth: [
      {
        label: 'Open OAuth2 Applications',
        detail: 'Go to your Gitea instance → User Settings → Applications → Manage OAuth2 Applications.',
        link: { label: 'Open Gitea Settings →', url: 'http://localhost:4000/user/settings/applications' },
        checks: ['Logged in to Gitea as admin or org owner'],
      },
      {
        label: 'Create new OAuth2 application',
        detail: 'Click Create OAuth2 Application. Set the application name and paste the redirect URI below.',
        copyFields: [{ label: 'Redirect URI', value: cbUrl('gitea') }],
        checks: ['Application name set', 'Redirect URI pasted'],
      },
      {
        label: 'Copy credentials',
        detail: 'After saving, Gitea shows the Client ID and Client Secret. Copy both immediately.',
        checks: ['Client ID copied', 'Client Secret copied (shown only once)'],
      },
      {
        label: 'Paste credentials here',
        detail: 'Click Configure on the Gitea card. Set the Base URL to your Gitea instance address (e.g. http://localhost:4000).',
        checks: ['Base URL set', 'Client ID entered', 'Client Secret entered'],
      },
    ],
    pat: [
      {
        label: 'Generate an Access Token',
        detail: 'Go to Gitea → User Settings → Applications → Generate New Token.',
        link: { label: 'Open Gitea Settings →', url: 'http://localhost:4000/user/settings/applications' },
        checks: ['Token name set'],
      },
      {
        label: 'Copy and paste token',
        detail: 'Copy the generated token immediately. Click Configure on the Gitea card and paste the token along with your Gitea Base URL.',
        checks: ['Token copied', 'Base URL set', 'Token pasted in Configure modal'],
      },
    ],
  },
};
