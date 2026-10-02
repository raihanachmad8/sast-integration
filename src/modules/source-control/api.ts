import { apiDelete, apiFetch, apiPatch, apiPost } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { REPOSITORY_CONNECTION_TYPES } from '@/commons/constants/scan';

export interface SourceControl {
  id: string;
  workspace_id: string;
  provider: string;
  name: string;
  credentials: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface SourceControlPayload {
  provider: string;
  name: string;
  credentials: Record<string, unknown>;
}

export interface SourceControlSaveResult {
  sourceControl: SourceControl | null;
  redirectUrl: string | null;
}

export interface SourceControlSyncResult {
  provider: string;
  repos: number;
  imported: number;
  newWebhooks: number;
  connected: number;
  discovered?: number;
}

export async function listSourceControls(workspaceId: string): Promise<SourceControl[]> {
  return apiFetch<SourceControl[]>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId));
}

export async function createSourceControl(
  workspaceId: string,
  payload: SourceControlPayload,
): Promise<SourceControlSaveResult> {
  return apiPost<SourceControlSaveResult>(ENDPOINTS.SOURCE_CONTROLS.LIST(workspaceId), payload);
}

export async function updateSourceControl(
  workspaceId: string,
  providerId: string,
  payload: Partial<SourceControlPayload>,
): Promise<SourceControlSaveResult> {
  return apiPatch<SourceControlSaveResult>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, providerId), payload);
}

export async function deleteSourceControl(workspaceId: string, providerId: string): Promise<void> {
  await apiDelete<void>(ENDPOINTS.SOURCE_CONTROLS.DETAIL(workspaceId, providerId));
}

export async function testSourceControl(workspaceId: string, providerId: string) {
  return apiPost(ENDPOINTS.SOURCE_CONTROLS.TEST(workspaceId, providerId));
}

export async function syncSourceControl(workspaceId: string, providerId: string): Promise<SourceControlSyncResult> {
  return apiPost<SourceControlSyncResult>(ENDPOINTS.SOURCE_CONTROLS.SYNC(workspaceId, providerId));
}

export async function sendSourceControlTestEvent(workspaceId: string, eventType: 'push' | 'pull_request') {
  return apiPost(ENDPOINTS.SOURCE_CONTROLS.TEST_EVENT(workspaceId), { eventType });
}

// ============================================
// Repository Catalog
// ============================================

export interface RepoCatalog {
  id: string;
  provider: string;
  providerIcon: string;
  fullName: string;
  name: string;
  url: string;
  branch: string;
  visibility: string;
  imported: boolean;
  webhookStatus: 'active' | 'inactive' | 'error';
  project?: string;
  projectId?: string;
  sourceControlId?: string | null;
}

interface BackendRepositoryCatalogRow {
  id: string;
  name: string;
  url: string;
  default_branch: string | null;
  connection_type: string;
  source_control_id?: string | null;
  webhook_id?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  source_control_provider?: string | null;
  source_control_name?: string | null;
}

export interface ImportRepositoryPayload {
  projectId: string;
  name: string;
  url: string;
  defaultBranch?: string;
  sourceControlId?: string | null;
  autoScan?: boolean;
}

export async function listRepos(workspaceId: string): Promise<RepoCatalog[]> {
  const rows = await apiFetch<BackendRepositoryCatalogRow[]>(ENDPOINTS.REPOSITORIES.LIST_WORKSPACE(workspaceId));
  return rows.map(toRepoCatalog);
}

export async function importRepository(workspaceId: string, payload: ImportRepositoryPayload) {
  return apiPost(
    ENDPOINTS.REPOSITORIES.IMPORT(workspaceId, payload.projectId),
    {
      name: payload.name,
      url: payload.url,
      defaultBranch: payload.defaultBranch,
      sourceControlId: payload.sourceControlId ?? undefined,
      autoScan: payload.autoScan,
    }
  );
}

export async function deleteRepository(workspaceId: string, projectId: string, repoId: string): Promise<void> {
  await apiDelete<void>(ENDPOINTS.REPOSITORIES.DETAIL(workspaceId, projectId, repoId));
}

function toRepoCatalog(row: BackendRepositoryCatalogRow): RepoCatalog {
  const provider = row.source_control_name ?? providerNameFromKey(row.source_control_provider) ?? detectProvider(row.url);
  return {
    id: row.id,
    provider,
    providerIcon: providerIcon(provider),
    fullName: toFullName(row.url, row.name),
    name: row.name,
    url: row.url,
    branch: row.default_branch ?? 'main',
    visibility: row.connection_type === REPOSITORY_CONNECTION_TYPES.SCM ? 'SCM' : 'External',
    imported: Boolean(row.project_id),
    webhookStatus: row.webhook_id ? 'active' : 'inactive',
    project: row.project_name ?? undefined,
    projectId: row.project_id ?? undefined,
    sourceControlId: row.source_control_id ?? null,
  };
}

function providerNameFromKey(provider?: string | null) {
  const labels: Record<string, string> = {
    github: 'GitHub',
    gitlab: 'GitLab',
    gitea: 'Gitea',
    bitbucket: 'Bitbucket',
    'azure-devops': 'Azure DevOps',
  };
  return provider ? labels[provider] : undefined;
}

function detectProvider(url: string) {
  if (url.includes('github.com')) return 'GitHub';
  if (url.includes('gitlab.com')) return 'GitLab';
  if (url.includes('dev.azure.com') || url.includes('visualstudio.com')) return 'Azure DevOps';
  return 'Git';
}

function providerIcon(provider: string) {
  const icons: Record<string, string> = {
    GitHub: 'fa-brands fa-github',
    GitLab: 'fa-brands fa-gitlab',
    'Azure DevOps': 'fa-brands fa-microsoft',
  };
  return icons[provider] ?? 'fa-solid fa-code-fork';
}

function toFullName(url: string, fallback: string) {
  const withoutSuffix = url.replace(/\.git$/, '');
  const parts = withoutSuffix.split(/[/:]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts.at(-2)}/${parts.at(-1)}`;
  }
  return fallback;
}
