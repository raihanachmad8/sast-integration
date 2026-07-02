import { APP_BASE_URL } from '@/commons/constants/app';

import type { SetupGuide } from './SetupGuideDrawer';

const cbUrl = (id: string) => `${APP_BASE_URL}/api/v1/source-control/callback/${id}`;

export const GITHUB_GUIDE: SetupGuide = {
  title: 'GitHub setup',
  docsUrl: 'https://docs.github.com/en/apps/creating-github-apps',
  modes: [
    { key: 'app', label: 'GitHub App', desc: 'Recommended — fine-grained, no user token needed' },
    { key: 'oauth', label: 'OAuth App', desc: 'Classic flow — broader scope' },
    { key: 'pat', label: 'Personal Access Token', desc: 'Quick — user-scoped token' },
  ],
  steps: {
    app: [
      {
        label: 'Create a GitHub App',
        detail: 'In your GitHub organization settings, create a new GitHub App.',
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
        label: 'Set repository permissions',
        detail: 'Under Permissions & events → Repository permissions, set:',
        checks: [
          'Contents → Read-only',
          'Pull requests → Read and write',
          'Checks → Read and write',
          'Commit statuses → Read and write',
          'Metadata → Read-only (required)',
        ],
      },
      {
        label: 'Subscribe to events',
        detail: 'Under Subscribe to events, enable:',
        checks: ['Push', 'Pull request', 'Check run'],
      },
      {
        label: 'Generate private key',
        detail: 'Scroll to the bottom → Generate a private key. A .pem file will download.',
        checks: ['Private key downloaded (.pem)', 'App ID noted (top of App page)', 'App slug noted (from App URL)'],
      },
      {
        label: 'Install app',
        detail: 'Go to the App page → Install App → select your organization → choose repositories.',
        checks: ['App installed to organization'],
      },
      {
        label: 'Paste credentials in SAST',
        detail: 'Click Configure on the GitHub card and fill in App ID, App slug, and paste the private key content.',
        checks: ['App ID entered', 'App slug entered', 'Private key pasted'],
      },
    ],
    oauth: [
      {
        label: 'Create an OAuth App',
        detail: 'In GitHub Developer Settings, create a new OAuth App.',
        link: { label: 'Open OAuth Apps →', url: 'https://github.com/settings/developers' },
        checks: ['Application name set', 'Homepage URL filled in'],
      },
      {
        label: 'Set callback URL',
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
        label: 'Paste credentials in SAST',
        detail: 'Click Configure on the GitHub card and fill in Client ID and Client Secret.',
        checks: ['Client ID entered', 'Client Secret entered'],
      },
    ],
    pat: [
      {
        label: 'Generate a Personal Access Token',
        detail: 'In GitHub Developer Settings, generate a new fine-grained Personal Access Token.',
        link: { label: 'Open token settings →', url: 'https://github.com/settings/tokens?type=beta' },
        checks: ['Token name set', 'Expiration set (recommended: 90 days)', 'Resource owner selected'],
      },
      {
        label: 'Set repository permissions',
        detail: 'Under Repository permissions, grant the following:',
        checks: [
          'Contents → Read-only',
          'Pull requests → Read and write',
          'Commit statuses → Read and write',
          'Metadata → Read-only (required)',
        ],
      },
      {
        label: 'Copy and paste token',
        detail: 'Click Generate token. Copy it immediately — it won\'t be shown again. Paste it in the Configure modal.',
        checks: ['Token copied', 'Token pasted in Configure modal'],
      },
    ],
  },
};
