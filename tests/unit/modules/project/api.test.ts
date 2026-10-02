/**
 * Unit tests for Projects API module.
 *
 * Purpose: Verify that all project API functions correctly call the API client
 * with the expected workspace-scoped endpoints, parameters, and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listProjects, getProject, createProject, updateProject, deleteProject } from '@/modules/project/api';
import { apiFetch, apiPost, apiPut, apiDelete } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);
const mockApiPost = vi.mocked(apiPost);
const mockApiPut = vi.mocked(apiPut);
const mockApiDelete = vi.mocked(apiDelete);

const WORKSPACE_ID = 'ws-test-123';
const PROJECT_ID = 'proj-test-456';

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  description: 'A test project',
  lead: 'user-1',
  teams: [],
  members: [],
  repositories: [],
  automation: [],
};

const mockProjects = [
  mockProject,
  {
    id: 'proj-other-789',
    name: 'Other Project',
    description: 'Another project',
    lead: 'user-2',
    teams: [],
    members: [],
    repositories: [],
    automation: [],
  },
];

const mockCreatePayload = {
  name: 'New Project',
  description: 'Created for testing',
  lead: 'user-3',
  teamIds: [],
  memberIds: [],
  repositoryIds: [],
  settings: {
    enforceQualityGate: true,
    notifyOnCritical: true,
    autoTriggerScan: false,
  },
};

describe('Project API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should call apiFetch with correct workspace-scoped endpoint', async () => {
      mockApiFetch.mockResolvedValue(mockProjects);

      const result = await listProjects(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects`,
      );
      expect(result).toEqual(mockProjects);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when workspace has no projects', async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await listProjects(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects`,
      );
      expect(result).toEqual([]);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Unauthorized'));

      await expect(listProjects(WORKSPACE_ID)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getProject', () => {
    it('should call apiFetch with correct workspace-scoped endpoint', async () => {
      mockApiFetch.mockResolvedValue(mockProject);

      const result = await getProject(WORKSPACE_ID, PROJECT_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}`,
      );
      expect(result).toEqual(mockProject);
      expect(result!.id).toBe(PROJECT_ID);
    });

    it('should return null for non-existent project', async () => {
      mockApiFetch.mockResolvedValue(null);

      const result = await getProject(WORKSPACE_ID, 'proj-nonexistent');

      expect(result).toBeNull();
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Not found'));

      await expect(getProject(WORKSPACE_ID, 'proj-nonexistent')).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('createProject', () => {
    it('should call apiPost with correct endpoint and payload', async () => {
      const created = { ...mockProject, ...mockCreatePayload, id: 'proj-new-999' };
      mockApiPost.mockResolvedValue(created);

      const result = await createProject(WORKSPACE_ID, mockCreatePayload);

      expect(mockApiPost).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects`,
        mockCreatePayload,
      );
      expect(result.id).toBe('proj-new-999');
      expect(result.name).toBe('New Project');
    });

    it('should throw on validation error (e.g. duplicate name)', async () => {
      mockApiPost.mockRejectedValue(new Error('Project name already exists'));

      await expect(createProject(WORKSPACE_ID, mockCreatePayload)).rejects.toThrow(
        'Project name already exists',
      );
    });
  });

  describe('updateProject', () => {
    it('should call apiPut with correct endpoint and payload', async () => {
      const updatePayload = { name: 'Renamed Project' };
      const updated = { ...mockProject, ...updatePayload };
      mockApiPut.mockResolvedValue(updated);

      const result = await updateProject(WORKSPACE_ID, PROJECT_ID, updatePayload);

      expect(mockApiPut).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}`,
        updatePayload,
      );
      expect(result.name).toBe('Renamed Project');
    });

    it('should update multiple fields at once', async () => {
      const updatePayload = {
        name: 'Updated Name',
        description: 'Updated description',
      };
      mockApiPut.mockResolvedValue({ ...mockProject, ...updatePayload });

      const result = await updateProject(WORKSPACE_ID, PROJECT_ID, updatePayload);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
    });

    it('should throw when project does not exist', async () => {
      mockApiPut.mockRejectedValue(new Error('Project not found'));

      await expect(
        updateProject(WORKSPACE_ID, 'proj-nonexistent', { name: 'New' }),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('deleteProject', () => {
    it('should call apiDelete with correct endpoint', async () => {
      mockApiDelete.mockResolvedValue({ success: true });

      const result = await deleteProject(WORKSPACE_ID, PROJECT_ID);

      expect(mockApiDelete).toHaveBeenCalledWith(
        `/api/v1/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}`,
      );
      expect(result.success).toBe(true);
    });

    it('should throw when project does not exist', async () => {
      mockApiDelete.mockRejectedValue(new Error('Project not found'));

      await expect(deleteProject(WORKSPACE_ID, 'proj-nonexistent')).rejects.toThrow(
        'Project not found',
      );
    });

    it('should throw when user lacks permission', async () => {
      mockApiDelete.mockRejectedValue(new Error('Forbidden'));

      await expect(deleteProject(WORKSPACE_ID, PROJECT_ID)).rejects.toThrow('Forbidden');
    });
  });
});
