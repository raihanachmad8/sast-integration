/**
 * Frontend Scan API Layer (Mockable)
 *
 * This is the SINGLE place where we decide whether to use mock data
 * or call the real backend.
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false (or remove the mocks)
 *   2. Implement the real fetch versions inside each function
 *   3. The page / components do NOT need to change
 *
 * All queryFn and mutation logic for the Scan domain should go through here.
 */

import {
  mockProjects,
  mockRepositories,
  mockScanPolicies,
  mockScans,
  type MockProject,
  type MockRepository,
  type MockScanPolicy,
  type MockScan,
} from './mock-data';

// Toggle this (or use env var) while developing UI without backend
const USE_MOCK_DATA = true;

// Small helper to simulate network latency in mock mode
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// Types (can be moved to a shared types file later)
// ============================================

export interface Project {
  id: string;
  name: string | null;
  slug: string | null;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  default_branch: string | null;
  connection_type: 'scm' | 'external';
  current_policy_id: string | null;
}

export interface ScanPolicy {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  severity_threshold: string;
  timeout_seconds: number | null;
  max_findings: number | null;
}

export interface Scan {
  id: string;
  origin: 'managed' | 'external_upload';
  trigger_source: string | null;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  created_at: string | null;
}

// Types for the focused Scans table view
export type { MockScanRow } from './mock-data';

// ============================================
// API Functions
// ============================================

export async function listProjects(workspaceId: string): Promise<Project[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return mockProjects as Project[];
  }

  // Real implementation will go here later
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/projects`);
  const json = await res.json();
  return json.data;
}

export async function listRepositories(
  workspaceId: string,
  projectId: string
): Promise<Repository[]> {
  if (USE_MOCK_DATA) {
    await delay(140);
    // In mock mode we return all repos (project filter is UI concern for now)
    return mockRepositories as Repository[];
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`
  );
  const json = await res.json();
  return json.data;
}

export async function listScanPolicies(workspaceId: string): Promise<ScanPolicy[]> {
  if (USE_MOCK_DATA) {
    await delay(110);
    return mockScanPolicies as ScanPolicy[];
  }

  const res = await fetch(`/api/v1/workspaces/${workspaceId}/scan-policies`);
  const json = await res.json();
  return json.data;
}

export { listScanPolicies as listScanProfiles };

export async function getRepositoryScans(
  workspaceId: string,
  projectId: string,
  repositoryId: string
): Promise<{ repository: Repository; scans: Scan[] }> {
  if (USE_MOCK_DATA) {
    await delay(130);
    const repo = mockRepositories.find((r) => r.id === repositoryId) as Repository;
    const scans = (mockScans[repositoryId] || []) as Scan[];
    return { repository: repo, scans };
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/scans`
  );
  const json = await res.json();
  return json.data;
}

// ============================================
// Additional API Functions for Scan Table View
// ============================================

import {
  MOCK_SCAN_ROWS,
  MOCK_SCAN_REPOSITORIES,
  MOCK_SCAN_DETAILS,
  MOCK_SCAN_FINDINGS,
} from '@/lib/mockData';
import type { ScanRow, ScanRepository, ScanDetail, Finding } from '@/commons/types';

export async function listScanRows(): Promise<ScanRow[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_SCAN_ROWS;
  }
  const res = await fetch('/api/v1/scans');
  const json = await res.json();
  return json.data;
}

export async function listScanRepositories(): Promise<ScanRepository[]> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_SCAN_REPOSITORIES;
  }
  const res = await fetch('/api/v1/scans/repositories');
  const json = await res.json();
  return json.data;
}

export async function getScanDetail(id: string): Promise<ScanDetail | null> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_SCAN_DETAILS[id] ?? null;
  }
  const res = await fetch(`/api/v1/scans/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function listScanFindings(scanId: string): Promise<Finding[]> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_SCAN_FINDINGS.filter((f) => f.file.startsWith('src/'));
  }
  const res = await fetch(`/api/v1/scans/${scanId}/findings`);
  const json = await res.json();
  return json.data;
}

export async function runManagedScan(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
  branch: string
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK_DATA) {
    await delay(350);
    console.log('[MOCK] runManagedScan called', { repositoryId, branch });
    return {
      success: true,
      message: 'Managed scan queued (mock)',
    };
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/scans/run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch }),
    }
  );
  return res.json();
}

export async function configureRepositorySchedule(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
  payload: {
    active: boolean;
    cronExpression: string;
    timezone: string;
    branch: string;
  }
): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(280);
    console.log('[MOCK] configureRepositorySchedule', { repositoryId, payload });
    return { success: true };
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/schedule`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export async function attachPolicyToRepository(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
  policyId: string
): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(220);
    console.log('[MOCK] attachPolicyToRepository', { repositoryId, policyId });

    // Update mock state in-memory (simple simulation)
    const repo = mockRepositories.find((r) => r.id === repositoryId);
    if (repo) repo.current_policy_id = policyId;

    return { success: true };
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/policy`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_id: policyId }),
    }
  );
  return res.json();
}

export async function detachPolicyFromRepository(
  workspaceId: string,
  projectId: string,
  repositoryId: string
): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(180);
    console.log('[MOCK] detachPolicyFromRepository', { repositoryId });

    const repo = mockRepositories.find((r) => r.id === repositoryId);
    if (repo) repo.current_policy_id = null;

    return { success: true };
  }

  const res = await fetch(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/policy`,
    { method: 'DELETE' }
  );
  return res.json();
}
