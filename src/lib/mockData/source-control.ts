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
];
