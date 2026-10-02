import type { RepositoryConnectionType } from '@/commons/constants/scan';
import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';

export interface RepositoryRow {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  connection_type: RepositoryConnectionType;
  provider: 'github' | 'gitlab' | 'gitea' | null;
  project: string;
  lastScan: string | null;
  scanCount: number;
  findings: number;
  critical: number;
  status: 'active' | 'inactive' | 'error';
  policyName: string | null;
}

export const MOCK_REPOSITORIES: RepositoryRow[] = [
  {
    id: 'repo_01',
    name: 'backend-api',
    url: 'https://github.com/acme/backend-api',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    provider: 'github',
    project: 'Core Platform',
    lastScan: '12 min ago',
    scanCount: 24,
    findings: 28,
    critical: 4,
    status: 'active',
    policyName: 'Standard Security',
  },
  {
    id: 'repo_02',
    name: 'customer-web',
    url: 'https://github.com/acme/customer-web',
    default_branch: 'release',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    provider: 'github',
    project: 'Core Platform',
    lastScan: '1 hr ago',
    scanCount: 18,
    findings: 9,
    critical: 1,
    status: 'active',
    policyName: 'Strict - High Criticality',
  },
  {
    id: 'repo_03',
    name: 'mobile-ios',
    url: 'https://gitlab.com/acme/mobile-ios',
    default_branch: 'develop',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    provider: 'gitlab',
    project: 'Mobile Apps',
    lastScan: '3 days ago',
    scanCount: 7,
    findings: 3,
    critical: 0,
    status: 'active',
    policyName: 'Standard Security',
  },
  {
    id: 'repo_04',
    name: 'infra-terraform',
    url: 'https://github.com/acme/infra-terraform',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.EXTERNAL,
    provider: 'github',
    project: 'Core Platform',
    lastScan: 'Yesterday',
    scanCount: 12,
    findings: 5,
    critical: 2,
    status: 'active',
    policyName: null,
  },
  {
    id: 'repo_05',
    name: 'data-pipeline',
    url: 'https://gitea.internal/acme/data-pipeline',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    provider: 'gitea',
    project: 'Core Platform',
    lastScan: null,
    scanCount: 0,
    findings: 0,
    critical: 0,
    status: 'inactive',
    policyName: null,
  },
  {
    id: 'repo_06',
    name: 'auth-service',
    url: 'https://github.com/acme/auth-service',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    provider: 'github',
    project: 'Core Platform',
    lastScan: '5 min ago',
    scanCount: 31,
    findings: 14,
    critical: 3,
    status: 'active',
    policyName: 'Strict - High Criticality',
  },
];
