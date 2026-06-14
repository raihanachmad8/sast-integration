export interface RepoCatalog {
  id: string;
  provider: string;
  providerIcon: string;
  fullName: string;
  branch: string;
  visibility: string;
  imported: boolean;
  webhookStatus: 'active' | 'pending' | null;
  project: string;
}

export const MOCK_REPOS: RepoCatalog[] = [
  { id: '1', provider: 'GitHub', providerIcon: 'fa-brands fa-github', fullName: 'acme/backend-api', branch: 'main', visibility: 'private', imported: true, webhookStatus: 'active', project: 'Commerce Platform' },
  { id: '2', provider: 'GitHub', providerIcon: 'fa-brands fa-github', fullName: 'acme/customer-web', branch: 'release', visibility: 'private', imported: true, webhookStatus: 'active', project: 'Commerce Platform' },
  { id: '3', provider: 'GitHub', providerIcon: 'fa-brands fa-github', fullName: 'acme/payment-worker', branch: 'main', visibility: 'private', imported: false, webhookStatus: null, project: '' },
  { id: '4', provider: 'GitLab', providerIcon: 'fa-brands fa-gitlab', fullName: 'acme/mobile-app', branch: 'develop', visibility: 'internal', imported: true, webhookStatus: 'pending', project: 'Mobile Delivery' },
  { id: '5', provider: 'GitLab', providerIcon: 'fa-brands fa-gitlab', fullName: 'acme/admin-console', branch: 'main', visibility: 'private', imported: false, webhookStatus: null, project: '' },
  { id: '6', provider: 'Gitea', providerIcon: 'fa-solid fa-code-fork', fullName: 'acme/internal-tools', branch: 'main', visibility: 'private', imported: true, webhookStatus: 'active', project: 'Internal Tools' },
];

export interface MockSourceControl {
  id: string;
  name: string;
  type: 'github' | 'gitlab' | 'gitea';
  status: 'Connected' | 'Disconnected' | 'Needs refresh';
  mode: string;
  org: string;
  discovered: number;
  imported: number;
  lastSync: string | null;
}

export const MOCK_SOURCE_CONTROLS: MockSourceControl[] = [
  { id: 'sc_01', name: 'GitHub Production', type: 'github', status: 'Connected', mode: 'OAuth', org: 'acme-corp', discovered: 24, imported: 12, lastSync: '2026-06-01T10:00:00Z' },
  { id: 'sc_02', name: 'GitLab Staging', type: 'gitlab', status: 'Connected', mode: 'Token', org: 'acme-staging', discovered: 18, imported: 8, lastSync: '2026-06-01T09:30:00Z' },
  { id: 'sc_03', name: 'Gitea Internal', type: 'gitea', status: 'Connected', mode: 'OAuth', org: 'acme-internal', discovered: 12, imported: 5, lastSync: '2026-06-01T08:00:00Z' },
];
