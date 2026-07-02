import { APP_BASE_URL } from '@/commons/constants/app';

import type { SetupGuide } from './SetupGuideDrawer';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

export const GITLAB_GUIDE: SetupGuide = {
  title: 'GitLab setup',
  docsUrl: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
  modes: [
    { key: 'oauth', label: 'OAuth Application', desc: 'Recommended — group-level or instance-level app' },
    { key: 'pat', label: 'Personal Access Token', desc: 'Quick — user-scoped token' },
  ],
  steps: {
    oauth: [
      {
        label: 'Create an OAuth application',
        detail: 'In your GitLab group settings, add a new application.',
        link: { label: 'Open GitLab Applications →', url: 'https://gitlab.com/-/profile/applications' },
        checks: ['Application name set (e.g. sast-integration)', 'Confidential checkbox checked'],
      },
      {
        label: 'Set redirect URI',
        detail: 'Paste this exact value into the Redirect URI field:',
        copyFields: [{ label: 'Redirect URI', value: cbUrl('gitlab') }],
        checks: ['Redirect URI pasted'],
      },
      {
        label: 'Set required scopes',
        detail: 'Check the following scopes. The `api` scope is required for PR comments and commit statuses:',
        checks: ['api (required — enables MR notes, discussions, commit statuses)', 'read_repository (optional — enables repo listing)'],
      },
      {
        label: 'Save and copy credentials',
        detail: 'Click Save application. Copy the Application ID and Secret — they\'re shown only once.',
        checks: ['Application ID copied', 'Secret copied (shown only once)'],
      },
      {
        label: 'Paste credentials in SAST',
        detail: 'Click Configure on the GitLab card and fill in Application ID and Secret.',
        checks: ['Application ID entered', 'Secret entered'],
      },
    ],
    pat: [
      {
        label: 'Create a Personal Access Token',
        detail: 'In GitLab user settings, create a new access token.',
        link: { label: 'Open Access Tokens →', url: 'https://gitlab.com/-/user_settings/personal_access_tokens' },
        checks: ['Token name set', 'Expiration date set'],
      },
      {
        label: 'Set required scopes',
        detail: 'Check these scopes. `api` is required for PR comments and commit statuses:',
        checks: ['api (required — MR notes, discussions, commit statuses)', 'read_repository (list repositories)'],
      },
      {
        label: 'Copy and paste token',
        detail: 'Click Create personal access token. Copy it immediately and paste in the Configure modal.',
        checks: ['Token copied', 'Token pasted in Configure modal'],
      },
    ],
  },
};
