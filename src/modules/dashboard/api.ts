import { apiFetch } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/**
 * Dashboard API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DashboardStats {
  connectedRepos: number;
  activeScans: number;
  criticalFindings: number;
  awaitingAi: number;
}

export interface DashboardScan {
  id: string;
  repository: string;
  branch: string;
  status: string;
  stage: string;
  findings: number;
  critical: number;
  ai: string;
  time: string;
}

export interface DashboardFinding {
  id: string;
  rule: string;
  file: string;
  verdict: string;
}

export interface DashboardHealth {
  label: string;
  status: string;
  variant: 'teal' | 'amber' | 'purple';
}

export async function getDashboardStats(_workspaceId: string): Promise<DashboardStats> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return { connectedRepos: 3, activeScans: 1, criticalFindings: 4, awaitingAi: 6 };
  }
  return apiFetch<DashboardStats>(ENDPOINTS.DASHBOARD.STATS);
}

export async function getDashboardScans(_workspaceId: string): Promise<DashboardScan[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return [
      { id: '1', repository: 'backend-api', branch: 'main', status: 'Running', stage: 'AI verification', findings: 28, critical: 4, ai: '22/28', time: '12 min ago' },
      { id: '2', repository: 'customer-web', branch: 'release', status: 'Completed', stage: 'Completed', findings: 9, critical: 1, ai: '9/9', time: '1 hr ago' },
      { id: '3', repository: 'backend-api', branch: 'main', status: 'Failed', stage: 'Gitleaks timeout', findings: 0, critical: 0, ai: '0/0', time: 'Yesterday' },
    ];
  }
  return apiFetch<DashboardScan[]>(ENDPOINTS.DASHBOARD.SCANS);
}

export async function getDashboardFindings(_workspaceId: string): Promise<DashboardFinding[]> {
  if (USE_MOCK_DATA) {
    await delay(110);
    return [
      { id: '1', rule: 'SQL Injection', file: 'src/routes/orders.ts:88', verdict: 'TP' },
      { id: '2', rule: 'Unchecked strcpy', file: 'native/parser.c:42', verdict: 'Pending' },
    ];
  }
  return apiFetch<DashboardFinding[]>(ENDPOINTS.DASHBOARD.FINDINGS);
}

export async function getDashboardHealth(_workspaceId: string): Promise<DashboardHealth[]> {
  if (USE_MOCK_DATA) {
    await delay(90);
    return [
      { label: 'Semgrep and Gitleaks available', status: 'Ready', variant: 'teal' },
      { label: 'mobile-app source token needs refresh', status: 'Warning', variant: 'amber' },
      { label: 'Modal QLoRA primary, Ollama fallback', status: 'AI', variant: 'purple' },
    ];
  }
  return apiFetch<DashboardHealth[]>(ENDPOINTS.DASHBOARD.HEALTH);
}
