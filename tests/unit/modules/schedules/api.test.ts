/**
 * Unit tests for Schedules API module.
 *
 * Purpose: Verify that all Schedule API functions correctly call the API client
 * with the expected endpoints and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule, toggleSchedule } from '@/modules/schedules/api';
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
const SCHEDULE_ID = 'sch-test-456';

const mockSchedule = {
  id: SCHEDULE_ID,
  repositoryId: 'repo-123',
  repositoryName: 'backend-api',
  policyId: 'policy-456',
  branch: 'main',
  cronExpression: '0 2 * * *',
  timezone: 'UTC',
  active: true,
  lastRunAt: '2024-01-01T02:00:00Z',
  nextRunAt: '2024-01-02T02:00:00Z',
  createdBy: 'user-789',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('Schedules API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSchedules', () => {
    it('should call apiFetch with correct endpoint', async () => {
      mockApiFetch.mockResolvedValue([mockSchedule]);

      const result = await listSchedules(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules`);
      expect(result).toEqual([mockSchedule]);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(listSchedules(WORKSPACE_ID)).rejects.toThrow('Network error');
    });
  });

  describe('getSchedule', () => {
    it('should call apiFetch with correct endpoint', async () => {
      mockApiFetch.mockResolvedValue(mockSchedule);

      const result = await getSchedule(WORKSPACE_ID, SCHEDULE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules/${SCHEDULE_ID}`);
      expect(result).toEqual(mockSchedule);
    });

    it('should return null on error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Not found'));

      const result = await getSchedule(WORKSPACE_ID, SCHEDULE_ID);

      expect(result).toBeNull();
    });
  });

  describe('createSchedule', () => {
    it('should call apiPost with correct endpoint and data', async () => {
      const newData = { repositoryId: 'repo-789', cronExpression: '0 3 * * *' };
      mockApiPost.mockResolvedValue({ ...mockSchedule, ...newData });

      const result = await createSchedule(WORKSPACE_ID, newData);

      expect(mockApiPost).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules`, newData);
      expect(result.cronExpression).toBe('0 3 * * *');
    });

    it('should throw on validation error', async () => {
      mockApiPost.mockRejectedValue(new Error('Validation failed'));

      await expect(createSchedule(WORKSPACE_ID, {})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateSchedule', () => {
    it('should call apiPut with correct endpoint and data', async () => {
      const updateData = { cronExpression: '0 4 * * *' };
      mockApiPut.mockResolvedValue({ ...mockSchedule, ...updateData });

      const result = await updateSchedule(WORKSPACE_ID, SCHEDULE_ID, updateData);

      expect(mockApiPut).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules/${SCHEDULE_ID}`, updateData);
      expect(result.cronExpression).toBe('0 4 * * *');
    });
  });

  describe('deleteSchedule', () => {
    it('should call apiDelete with correct endpoint', async () => {
      mockApiDelete.mockResolvedValue(undefined);

      await deleteSchedule(WORKSPACE_ID, SCHEDULE_ID);

      expect(mockApiDelete).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules/${SCHEDULE_ID}`);
    });

    it('should throw on server error', async () => {
      mockApiDelete.mockRejectedValue(new Error('Server error'));

      await expect(deleteSchedule(WORKSPACE_ID, SCHEDULE_ID)).rejects.toThrow('Server error');
    });
  });

  describe('toggleSchedule', () => {
    it('should call apiPut with active state', async () => {
      mockApiPut.mockResolvedValue({ ...mockSchedule, active: false });

      const result = await toggleSchedule(WORKSPACE_ID, SCHEDULE_ID, false);

      expect(mockApiPut).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/schedules/${SCHEDULE_ID}`, { active: false });
      expect(result.active).toBe(false);
    });

    it('should enable schedule', async () => {
      mockApiPut.mockResolvedValue({ ...mockSchedule, active: true });

      const result = await toggleSchedule(WORKSPACE_ID, SCHEDULE_ID, true);

      expect(result.active).toBe(true);
    });
  });
});
