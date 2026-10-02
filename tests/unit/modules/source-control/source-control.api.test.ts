/**
 * Unit tests for source control client API helpers.
 *
 * Covers workspace-scoped source-control and repository catalog calls.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSourceControl,
  deleteRepository,
  deleteSourceControl,
  importRepository,
  listRepos,
  listSourceControls,
  sendSourceControlTestEvent,
  syncSourceControl,
  testSourceControl,
  updateSourceControl,
} from '@/modules/source-control/api';
import { apiDelete, apiFetch, apiPatch, apiPost } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);
const mockApiPost = vi.mocked(apiPost);
const mockApiPatch = vi.mocked(apiPatch);
const mockApiDelete = vi.mocked(apiDelete);

describe('source control API helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify source controls are listed through the workspace-scoped integration endpoint.
   */
  it('should list source controls through the workspace endpoint', async () => {
    mockApiFetch.mockResolvedValue([]);

    await listSourceControls('ws-1');

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls');
  });

  /**
   * Purpose: Verify provider creation posts credentials to the workspace-scoped integration endpoint.
   */
  it('should create a source control provider in the current workspace', async () => {
    const payload = { provider: 'github', name: 'GitHub', credentials: { installationId: '123' } };
    mockApiPost.mockResolvedValue({ id: 'sc-1', ...payload });

    await createSourceControl('ws-1', payload);

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls', payload);
  });

  /**
   * Purpose: Verify provider updates use the workspace-scoped provider detail endpoint.
   */
  it('should update a source control provider in the current workspace', async () => {
    const payload = { name: 'GitHub', credentials: { mode: 'github-app' } };
    mockApiPatch.mockResolvedValue({ id: 'sc-1', ...payload });

    await updateSourceControl('ws-1', 'sc-1', payload);

    expect(mockApiPatch).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls/sc-1', payload);
  });

  /**
   * Purpose: Verify provider test requests are sent to the backend instead of using a local-only toast.
   */
  it('should test a source control provider through the backend endpoint', async () => {
    mockApiPost.mockResolvedValue({ configured: true });

    await testSourceControl('ws-1', 'sc-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls/sc-1/test');
  });

  /**
   * Purpose: Verify provider sync requests use the backend endpoint that returns repository binding summaries.
   */
  it('should sync a source control provider through the backend endpoint', async () => {
    mockApiPost.mockResolvedValue({ provider: 'GitHub', repos: 1, imported: 1, newWebhooks: 0, connected: 0 });

    await syncSourceControl('ws-1', 'sc-1');

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls/sc-1/sync');
  });

  /**
   * Purpose: Verify repository catalog reads the active workspace repository schema instead of the removed legacy /api/v1/repos endpoint.
   */
  it('should list repository catalog rows from the workspace repositories endpoint', async () => {
    mockApiFetch.mockResolvedValue([
      {
        id: 'repo-1',
        name: 'backend',
        url: 'https://github.com/acme/backend.git',
        default_branch: 'main',
        connection_type: 'scm',
        source_control_id: 'sc-1',
        webhook_id: 'hook-1',
        project_id: 'proj-1',
        project_name: 'Core',
        source_control_provider: 'github',
        source_control_name: 'GitHub',
      },
      {
        id: 'repo-2',
        name: 'worker',
        url: 'https://github.com/acme/worker.git',
        default_branch: 'main',
        connection_type: 'scm',
        source_control_id: 'sc-1',
        webhook_id: null,
        project_id: null,
        project_name: null,
        source_control_provider: 'github',
        source_control_name: 'GitHub',
      },
    ]);

    const result = await listRepos('ws-1');

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/repositories');
    expect(result[0]).toMatchObject({
      fullName: 'acme/backend',
      imported: true,
      provider: 'GitHub',
      project: 'Core',
      webhookStatus: 'active',
    });
    expect(result[1]).toMatchObject({
      fullName: 'acme/worker',
      imported: false,
      provider: 'GitHub',
      project: undefined,
      webhookStatus: 'inactive',
    });
  });

  /**
   * Purpose: Verify importing a repository creates an SCM repository binding under the selected project.
   */
  it('should import a repository through the selected project endpoint', async () => {
    mockApiPost.mockResolvedValue({ id: 'repo-2' });

    await importRepository('ws-1', {
      projectId: 'proj-1',
      name: 'api',
      url: 'https://github.com/acme/api.git',
      defaultBranch: 'main',
      sourceControlId: 'sc-1',
      autoScan: true,
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      '/api/v1/workspaces/ws-1/projects/proj-1/repositories',
      {
        name: 'api',
        url: 'https://github.com/acme/api.git',
        defaultBranch: 'main',
        sourceControlId: 'sc-1',
        autoScan: true,
      }
    );
  });

  /**
   * Purpose: Verify uninstalling a repository calls the project repository DELETE endpoint.
   */
  it('should delete a repository through the selected project endpoint', async () => {
    mockApiDelete.mockResolvedValue(undefined);

    await deleteRepository('ws-1', 'proj-1', 'repo-1');

    expect(mockApiDelete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/projects/proj-1/repositories/repo-1');
  });

  /**
   * Purpose: Verify SCM test events are posted to the backend validation endpoint.
   */
  it('should send a source control test event through the backend endpoint', async () => {
    mockApiPost.mockResolvedValue({ accepted: true });

    await sendSourceControlTestEvent('ws-1', 'push');

    expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls/test-event', { eventType: 'push' });
  });

  /**
   * Purpose: Verify provider deletion remains workspace-scoped to avoid disconnecting another workspace's integration.
   */
  it('should delete a source control provider through the workspace endpoint', async () => {
    mockApiDelete.mockResolvedValue(undefined);

    await deleteSourceControl('ws-1', 'sc-1');

    expect(mockApiDelete).toHaveBeenCalledWith('/api/v1/workspaces/ws-1/source-controls/sc-1');
  });
});
