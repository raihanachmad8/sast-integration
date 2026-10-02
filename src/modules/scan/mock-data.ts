/**
 * Centralized mock data for the Scan module (UI-first development).
 *
 * This file is the single source of truth for fake data while we build
 * the UI without depending on the backend.
 *
 * When the real backend is ready, we can delete or ignore this file.
 */

import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';
import type { RepositoryConnectionType } from '@/commons/constants/scan';

export interface MockProject {
  id: string;
  name: string | null;
  slug: string | null;
}

export interface MockRepository {
  id: string;
  name: string;
  url: string;
  default_branch: string | null;
  connection_type: RepositoryConnectionType;
  current_policy_id: string | null;
}

export interface MockScanPolicy {
  id: string;
  name: string;
  profile: 'standard' | 'strict' | 'custom';
  scanners: string[];
  severity_threshold: string;
  timeout_seconds: number | null;
  max_findings: number | null;
}

export interface MockScan {
  id: string;
  origin: 'managed' | 'external_upload';
  trigger_source: string | null;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  created_at: string;
  policy_id?: string | null;
}

// ============================================
// Mock Datasets
// ============================================

export const mockProjects: MockProject[] = [
  { id: 'proj_01', name: 'Core Platform', slug: 'core-platform' },
  { id: 'proj_02', name: 'Mobile Apps', slug: 'mobile-apps' },
];

export const mockRepositories: MockRepository[] = [
  {
    id: 'repo_01',
    name: 'backend-api',
    url: 'https://github.com/acme/backend-api',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    current_policy_id: 'pol_01',
  },
  {
    id: 'repo_02',
    name: 'customer-web',
    url: 'https://github.com/acme/customer-web',
    default_branch: 'release',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    current_policy_id: 'pol_02',
  },
  {
    id: 'repo_03',
    name: 'backend-api',
    url: 'https://github.com/acme/backend-api',
    default_branch: 'main',
    connection_type: REPOSITORY_CONNECTION_TYPES.SCM,
    current_policy_id: 'pol_01',
  },
];

// Extended data to match the prototype table columns
export interface MockScanRow {
  id: string;
  repository: string;
  repoSub: string; // e.g. "main • 12 min ago"
  status: 'Running' | 'Completed' | 'Failed';
  stage: string;
  findings: number;
  critical: number;
  ai: string; // e.g. "22/28"
}

export const mockScanRows: MockScanRow[] = [
  {
    id: 'row_01',
    repository: 'backend-api',
    repoSub: 'main • 12 min ago',
    status: 'Running',
    stage: 'AI verification',
    findings: 28,
    critical: 4,
    ai: '22/28',
  },
  {
    id: 'row_02',
    repository: 'customer-web',
    repoSub: 'release • 1 hr ago',
    status: 'Completed',
    stage: 'Completed',
    findings: 9,
    critical: 1,
    ai: '9/9',
  },
  {
    id: 'row_03',
    repository: 'backend-api',
    repoSub: 'main • Yesterday',
    status: 'Failed',
    stage: 'Gitleaks timeout',
    findings: 0,
    critical: 0,
    ai: '0/0',
  },
];

export const mockScanPolicies: MockScanPolicy[] = [
  {
    id: 'pol_01',
    name: 'Standard Security',
    profile: 'standard',
    scanners: ['semgrep', 'gitleaks', 'trivy'],
    severity_threshold: 'medium',
    timeout_seconds: 300,
    max_findings: 2000,
  },
  {
    id: 'pol_02',
    name: 'Strict - High Criticality',
    profile: 'strict',
    scanners: ['semgrep', 'gitleaks', 'trivy', 'flawfinder', 'cppcheck'],
    severity_threshold: 'high',
    timeout_seconds: 600,
    max_findings: 500,
  },
];

export const mockScans: Record<string, MockScan[]> = {
  repo_01: [
    {
      id: 'scan_101',
      origin: 'managed',
      trigger_source: 'manual',
      status: 'completed',
      branch: 'main',
      commit_sha: 'a1b2c3d4e5',
      created_at: '2025-04-01T09:12:00Z',
      policy_id: 'pol_01',
    },
    {
      id: 'scan_102',
      origin: 'external_upload',
      trigger_source: 'ci-pipeline',
      status: 'completed',
      branch: 'main',
      commit_sha: 'f9e8d7c6b5',
      created_at: '2025-03-28T14:45:00Z',
    },
  ],
  repo_02: [
    {
      id: 'scan_201',
      origin: 'managed',
      trigger_source: 'schedule',
      status: 'completed',
      branch: 'develop',
      commit_sha: '1122334455',
      created_at: '2025-04-02T03:05:00Z',
      policy_id: 'pol_02',
    },
  ],
  repo_03: [],
  repo_04: [
    {
      id: 'scan_401',
      origin: 'managed',
      trigger_source: 'manual',
      status: 'completed',
      branch: 'main',
      commit_sha: '9988776655',
      created_at: '2025-03-30T11:20:00Z',
      policy_id: 'pol_01',
    },
  ],
};
