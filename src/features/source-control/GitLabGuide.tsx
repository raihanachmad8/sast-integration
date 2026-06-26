import type { SetupGuide } from './SetupGuideDrawer';
import { APP_BASE_URL } from '@/commons/constants/app';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

/**
 * Step-by-step setup guide for connecting GitLab via OAuth application or personal access token.
 *
 * @returns {@link SetupGuide} configuration object for the GitLab provider.
 *
 * @example
 * // Used internally by SetupGuideDrawer
 * const guide = GITLAB_GUIDE;
 */
export const GITLAB_GUIDE: SetupGuide = {
  title: 'GitLab setup',
  docsUrl: 'https://docs.gitlab.com/ee/integration/oauth_provider.html',
  modes: [
    { key: 'oauth', label: 'OAuth Application', desc: 'Recommended — group-level or instance-level app' },
    { key: 'pat', label: 'Personal Access Token', desc: 'Quick setup — user-scoped token' },
  ],
  steps: {
    oauth: [
      {
        label: 'Create an OAuth application',
        detail: 'Go to GitLab → your group → Settings → Applications → Add new application.',
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
        detail: 'Check the following scopes:',
        checks: ['api', 'read_repository', 'read_user'],
      },
      {
        label: 'Save and copy credentials',
        detail: 'Click Save application. GitLab will show the Application ID and Secret once — copy them immediately.',
        checks: ['Application ID copied', 'Secret copied (shown only once)'],
      },
      {
        label: 'Paste credentials here',
        detail: 'Click Configure on the GitLab card and fill in Application ID and Secret.',
        checks: ['Application ID entered', 'Secret entered'],
      },
    ],
    pat: [
      {
        label: 'Create a Personal Access Token',
        detail: 'Go to GitLab → User Settings → Access Tokens → Add new token.',
        link: { label: 'Open Access Tokens →', url: 'https://gitlab.com/-/user_settings/personal_access_tokens' },
        checks: ['Token name set', 'Expiration date set'],
      },
      {
        label: 'Set required scopes',
        detail: 'Select the following scopes:',
        checks: ['api', 'read_repository'],
      },
      {
        label: 'Copy and paste token',
        detail: 'Click Create personal access token. Copy it immediately and paste in the Configure modal.',
        checks: ['Token copied', 'Token pasted in Configure modal'],
      },
    ],
  },
};
