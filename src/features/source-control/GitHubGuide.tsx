import type { SetupGuide } from './SetupGuideDrawer';
import { APP_BASE_URL } from '@/commons/constants/app';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

export const GITHUB_GUIDE: SetupGuide = {
  title: 'GitHub setup',
  docsUrl: 'https://docs.github.com/en/apps/creating-github-apps',
  modes: [
    { key: 'app', label: 'GitHub App', desc: 'Recommended — fine-grained permissions, no user token needed' },
    { key: 'oauth', label: 'OAuth App', desc: 'Classic OAuth flow — simpler but broader scope' },
    { key: 'pat', label: 'Personal Access Token', desc: 'Quick setup — uses a user-scoped token' },
  ],
  steps: {
    app: [
      {
        label: 'Create a GitHub App',
        detail: 'Go to your GitHub organization settings → Developer settings → GitHub Apps → New GitHub App.',
        link: { label: 'Open GitHub App settings →', url: 'https://github.com/organizations/settings/apps/new' },
        checks: ['App name set (e.g. sast-integration)', 'Homepage URL filled in'],
      },
      {
        label: 'Set callback URL',
        detail: 'Copy this value into the Callback URL field in the GitHub App form.',
        copyFields: [{ label: 'Callback URL', value: cbUrl('github') }],
        checks: ['Callback URL pasted'],
      },
      {
        label: 'Set required permissions',
        detail: 'Under Permissions & events, set the following repository permissions:',
        checks: ['Contents → Read-only', 'Pull requests → Read & write', 'Checks → Read & write', 'Commit statuses → Read & write', 'Metadata → Read-only (mandatory)'],
      },
      {
        label: 'Subscribe to events',
        detail: 'Under Subscribe to events, enable:',
        checks: ['Push', 'Pull request', 'Check run'],
      },
      {
        label: 'Generate & download private key',
        detail: 'Scroll to the bottom of the App page → Generate a private key. A .pem file will download.',
        checks: ['Private key downloaded (.pem file)', 'App ID noted (shown at top of App page)', 'App slug noted (from App URL)'],
      },
      {
        label: 'Install app to your organization',
        detail: 'Go to the App page → Install App → select your organization → All repositories or select specific repos.',
        checks: ['App installed to organization'],
      },
      {
        label: 'Paste credentials here',
        detail: 'Click Configure on the GitHub card and fill in App ID, App slug, and paste the private key content.',
        checks: ['App ID entered', 'App slug entered', 'Private key pasted'],
      },
    ],
    oauth: [
      {
        label: 'Create an OAuth App',
        detail: 'Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.',
        link: { label: 'Open OAuth Apps →', url: 'https://github.com/settings/developers' },
        checks: ['Application name set', 'Homepage URL filled in'],
      },
      {
        label: 'Set authorization callback URL',
        detail: 'Paste this value into the Authorization callback URL field:',
        copyFields: [{ label: 'Callback URL', value: cbUrl('github') }],
        checks: ['Callback URL pasted'],
      },
      {
        label: 'Copy Client ID and Secret',
        detail: 'After creating, copy the Client ID. Then generate a Client Secret and copy it immediately.',
        checks: ['Client ID copied', 'Client Secret generated and copied'],
      },
      {
        label: 'Paste credentials here',
        detail: 'Click Configure on the GitHub card and fill in Client ID and Client Secret.',
        checks: ['Client ID entered', 'Client Secret entered'],
      },
    ],
    pat: [
      {
        label: 'Generate a Personal Access Token',
        detail: 'Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
        link: { label: 'Open token settings →', url: 'https://github.com/settings/tokens?type=beta' },
        checks: ['Token name set', 'Expiration set (recommended: 90 days)', 'Resource owner selected (your org)'],
      },
      {
        label: 'Set required permissions',
        detail: 'Under Repository permissions, grant:',
        checks: ['Contents → Read-only', 'Pull requests → Read & write', 'Commit statuses → Read & write', 'Metadata → Read-only'],
      },
      {
        label: 'Copy and paste token',
        detail: 'Click Generate token. Copy the token immediately — it won\'t be shown again. Paste it in the Configure modal.',
        checks: ['Token copied', 'Token pasted in Configure modal'],
      },
    ],
  },
};
