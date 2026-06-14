import type { Repository } from '@/commons/types';

/**
 * Mock repository data for development and testing.
 * Structured to match the future API response shape.
 *
 * @remarks
 * - `lastScan` uses ISO 8601 timestamps (not relative strings).
 * - `connectionType` uses lowercase: `'scm' | 'external'`.
 * - When replacing with API calls, response shape should match `Repository` type.
 */
export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 'repo_01',
    name: 'backend-api',
    url: 'https://github.com/acme/backend-api',
    branch: 'main',
    status: 'active',
    project: 'Core Platform',
    policyName: 'Standard Security',
    connectionType: 'scm',
    provider: 'github',
    findings: 28,
    scans: 24,
    lastScan: '2026-06-01T10:48:00.000Z',
  },
  {
    id: 'repo_02',
    name: 'customer-web',
    url: 'https://github.com/acme/customer-web',
    branch: 'release',
    status: 'active',
    project: 'Core Platform',
    policyName: 'Strict - High Criticality',
    connectionType: 'scm',
    provider: 'github',
    findings: 9,
    scans: 18,
    lastScan: '2026-06-01T09:48:00.000Z',
  },
  {
    id: 'repo_03',
    name: 'mobile-ios',
    url: 'https://gitlab.com/acme/mobile-ios',
    branch: 'develop',
    status: 'active',
    project: 'Mobile Apps',
    policyName: 'Standard Security',
    connectionType: 'scm',
    provider: 'gitlab',
    findings: 3,
    scans: 7,
    lastScan: '2026-05-29T10:48:00.000Z',
  },
  {
    id: 'repo_04',
    name: 'infra-terraform',
    url: 'https://github.com/acme/infra-terraform',
    branch: 'main',
    status: 'active',
    project: 'Core Platform',
    policyName: null,
    connectionType: 'external',
    provider: 'github',
    findings: 5,
    scans: 12,
    lastScan: '2026-05-31T10:48:00.000Z',
  },
  {
    id: 'repo_05',
    name: 'data-pipeline',
    url: 'https://gitea.internal/acme/data-pipeline',
    branch: 'main',
    status: 'inactive',
    project: 'Core Platform',
    policyName: null,
    connectionType: 'scm',
    provider: 'gitea',
    findings: 0,
    scans: 0,
    lastScan: null,
  },
  {
    id: 'repo_06',
    name: 'auth-service',
    url: 'https://github.com/acme/auth-service',
    branch: 'main',
    status: 'active',
    project: 'Core Platform',
    policyName: 'Strict - High Criticality',
    connectionType: 'scm',
    provider: 'github',
    findings: 14,
    scans: 31,
    lastScan: '2026-06-01T10:53:00.000Z',
  },
];

/**
 * Mock repositories for the new scan modal.
 * Uses the same data as MOCK_REPOSITORIES but shaped for scan modal usage.
 */
export const MOCK_SCAN_REPOSITORIES = MOCK_REPOSITORIES.map((r) => ({
  id: r.id,
  name: r.name,
  branch: r.branch,
  provider: r.provider,
  connectionType: r.connectionType,
}));
