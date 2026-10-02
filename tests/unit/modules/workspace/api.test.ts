/**
 * Unit tests for Workspace API module.
 *
 * Purpose: Verify that all workspace API functions correctly call the API client
 * with the expected endpoints, parameters, and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceApi } from '@/modules/workspace/api';
import { apiFetch, apiPost } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);
const mockApiPost = vi.mocked(apiPost);

const WORKSPACE_ID = 'ws-test-123';

const mockWorkspace = {
  id: WORKSPACE_ID,
  name: 'Test Workspace',
  slug: 'test-workspace',
  type: 'organization' as const,
  description: 'A test workspace',
  avatarUrl: null,
  role: 'admin',
  joinedAt: '2024-01-01T00:00:00Z',
};

const mockWorkspaces = [
  mockWorkspace,
  {
    id: 'ws-other-456',
    name: 'Other Workspace',
    slug: 'other-workspace',
    type: 'personal' as const,
    description: null,
    avatarUrl: null,
    role: 'member',
    joinedAt: '2024-02-01T00:00:00Z',
  },
];

describe('Workspace API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should call apiFetch with correct endpoint', async () => {
      mockApiFetch.mockResolvedValue(mockWorkspaces);

      const result = await workspaceApi.list();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/workspaces');
      expect(result).toEqual(mockWorkspaces);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no workspaces', async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await workspaceApi.list();

      expect(result).toEqual([]);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Unauthorized'));

      await expect(workspaceApi.list()).rejects.toThrow('Unauthorized');
    });
  });

  describe('create', () => {
    it('should call apiPost with correct endpoint and data', async () => {
      const createData = {
        name: 'New Workspace',
        type: 'organization' as const,
        description: 'Created for testing',
      };
      const created = { ...mockWorkspace, ...createData, id: 'ws-new-789' };
      mockApiPost.mockResolvedValue(created);

      const result = await workspaceApi.create(createData);

      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces', createData);
      expect(result.id).toBe('ws-new-789');
      expect(result.name).toBe('New Workspace');
    });

    it('should create workspace with minimal required data', async () => {
      const createData = { name: 'Minimal Workspace' };
      mockApiPost.mockResolvedValue({ ...mockWorkspace, ...createData });

      const result = await workspaceApi.create(createData);

      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/workspaces', createData);
      expect(result.name).toBe('Minimal Workspace');
    });

    it('should throw on validation error (e.g. duplicate slug)', async () => {
      mockApiPost.mockRejectedValue(new Error('Slug already exists'));

      await expect(
        workspaceApi.create({ name: 'Test', slug: 'taken-slug' }),
      ).rejects.toThrow('Slug already exists');
    });
  });

  describe('switchWorkspace', () => {
    it('should call apiPost with correct endpoint and workspace ID', async () => {
      const switchResponse = { currentWorkspaceId: WORKSPACE_ID };
      mockApiPost.mockResolvedValue(switchResponse);

      const result = await workspaceApi.switchWorkspace(WORKSPACE_ID);

      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/users/me', {
        currentWorkspaceId: WORKSPACE_ID,
      });
      expect(result).toEqual(switchResponse);
      expect(result.currentWorkspaceId).toBe(WORKSPACE_ID);
    });

    it('should throw when workspace does not exist', async () => {
      mockApiPost.mockRejectedValue(new Error('Workspace not found'));

      await expect(workspaceApi.switchWorkspace('ws-nonexistent')).rejects.toThrow(
        'Workspace not found',
      );
    });

    it('should throw when user lacks access to workspace', async () => {
      mockApiPost.mockRejectedValue(new Error('Forbidden'));

      await expect(workspaceApi.switchWorkspace('ws-forbidden')).rejects.toThrow('Forbidden');
    });
  });

  describe('update', () => {
    it('should call apiPost with correct endpoint and data', async () => {
      const updateData = { name: 'Renamed Workspace' };
      const updated = { ...mockWorkspace, ...updateData };
      mockApiPost.mockResolvedValue(updated);

      const result = await workspaceApi.update(WORKSPACE_ID, updateData);

      expect(mockApiPost).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}`, updateData);
      expect(result.name).toBe('Renamed Workspace');
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'Updated Name',
        slug: 'updated-slug',
        description: 'Updated description',
      };
      mockApiPost.mockResolvedValue({ ...mockWorkspace, ...updateData });

      const result = await workspaceApi.update(WORKSPACE_ID, updateData);

      expect(mockApiPost).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}`, updateData);
      expect(result.name).toBe('Updated Name');
      expect(result.slug).toBe('updated-slug');
      expect(result.description).toBe('Updated description');
    });

    it('should throw when workspace does not exist', async () => {
      mockApiPost.mockRejectedValue(new Error('Workspace not found'));

      await expect(workspaceApi.update('ws-nonexistent', { name: 'New' })).rejects.toThrow(
        'Workspace not found',
      );
    });

    it('should throw on slug conflict', async () => {
      mockApiPost.mockRejectedValue(new Error('Slug already taken'));

      await expect(
        workspaceApi.update(WORKSPACE_ID, { slug: 'taken-slug' }),
      ).rejects.toThrow('Slug already taken');
    });
  });
});
