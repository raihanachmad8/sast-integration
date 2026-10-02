/**
 * Scan Profiles API module.
 * Workspace-scoped CRUD operations for scan profiles.
 */

import { apiFetch, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/** Backend response shape (snake_case from DB) */
interface BackendScanProfile {
  id: string;
  workspace_id: string | null;
  name: string;
  profile: string;
  scanners: string[];
  ai_verification: string;
  severity_threshold: string;
  timeout_seconds: number | null;
  max_findings: number | null;
  created_at: string;
  updated_at: string | null;
}

/** Frontend type (camelCase) */
export interface ScanProfile {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  aiVerification: boolean;
  severityThreshold: string;
  timeoutSeconds: number;
  maxFindings: number;
  createdAt: string;
}

/** Map backend snake_case → frontend camelCase */
function toFrontend(b: BackendScanProfile): ScanProfile {
  return {
    id: b.id,
    name: b.name,
    profile: b.profile,
    scanners: b.scanners ?? [],
    aiVerification: b.ai_verification === 'enabled',
    severityThreshold: b.severity_threshold,
    timeoutSeconds: b.timeout_seconds ?? 300,
    maxFindings: b.max_findings ?? 2000,
    createdAt: b.created_at,
  };
}

/** Map frontend camelCase → backend snake_case */
function toBackend(data: Partial<ScanProfile>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.profile !== undefined) out.profile = data.profile;
  if (data.scanners !== undefined) out.scanners = data.scanners;
  if (data.aiVerification !== undefined) out.aiVerification = data.aiVerification;
  if (data.severityThreshold !== undefined) out.severityThreshold = data.severityThreshold;
  if (data.timeoutSeconds !== undefined) out.timeoutSeconds = data.timeoutSeconds;
  if (data.maxFindings !== undefined) out.maxFindings = data.maxFindings;
  return out;
}

export async function listScanProfiles(workspaceId: string): Promise<ScanProfile[]> {
  const raw = await apiFetch<BackendScanProfile[]>(ENDPOINTS.SCAN_PROFILES.LIST(workspaceId));
  return raw.map(toFrontend);
}

export async function getScanProfile(workspaceId: string, profileId: string): Promise<ScanProfile> {
  const raw = await apiFetch<BackendScanProfile>(ENDPOINTS.SCAN_PROFILES.DETAIL(workspaceId, profileId));
  return toFrontend(raw);
}

export async function createScanProfile(workspaceId: string, data: Partial<ScanProfile>): Promise<ScanProfile> {
  const raw = await apiPost<BackendScanProfile>(ENDPOINTS.SCAN_PROFILES.LIST(workspaceId), toBackend(data));
  return toFrontend(raw);
}

export async function updateScanProfile(workspaceId: string, profileId: string, data: Partial<ScanProfile>): Promise<ScanProfile> {
  const raw = await apiPut<BackendScanProfile>(ENDPOINTS.SCAN_PROFILES.DETAIL(workspaceId, profileId), toBackend(data));
  return toFrontend(raw);
}

export async function deleteScanProfile(workspaceId: string, profileId: string): Promise<void> {
  await apiDelete<void>(ENDPOINTS.SCAN_PROFILES.DETAIL(workspaceId, profileId));
}
