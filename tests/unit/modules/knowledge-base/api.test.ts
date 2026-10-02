/**
 * Unit tests for Knowledge Base API module.
 *
 * Purpose: Verify that all KB API functions correctly call the API client
 * with the expected endpoints and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listKnowledgeBase, getKnowledgeBaseEntry, createKnowledgeBaseEntry, updateKnowledgeBaseEntry, deleteKnowledgeBaseEntry } from '@/modules/knowledge-base/api';
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
const ENTRY_ID = 'entry-test-456';

const mockEntry = {
  id: ENTRY_ID,
  sourceId: 'src-123',
  cweId: 'CWE-89',
  title: 'SQL Injection',
  content: 'Description',
  severity: 'critical',
  tags: ['injection'],
  muted: false,
  usedByAiCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('Knowledge Base API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listKnowledgeBase', () => {
    it('should call apiFetch with correct endpoint', async () => {
      mockApiFetch.mockResolvedValue([mockEntry]);

      const result = await listKnowledgeBase(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/knowledge-base`);
      expect(result).toEqual([mockEntry]);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(listKnowledgeBase(WORKSPACE_ID)).rejects.toThrow('Network error');
    });
  });

  describe('getKnowledgeBaseEntry', () => {
    it('should call apiFetch with correct endpoint', async () => {
      mockApiFetch.mockResolvedValue(mockEntry);

      const result = await getKnowledgeBaseEntry(WORKSPACE_ID, ENTRY_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/knowledge-base/${ENTRY_ID}`);
      expect(result).toEqual(mockEntry);
    });

    it('should return null on error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Not found'));

      const result = await getKnowledgeBaseEntry(WORKSPACE_ID, ENTRY_ID);

      expect(result).toBeNull();
    });
  });

  describe('createKnowledgeBaseEntry', () => {
    it('should call apiPost with correct endpoint and data', async () => {
      const newData = { title: 'New Entry', severity: 'high' };
      mockApiPost.mockResolvedValue({ ...mockEntry, ...newData });

      const result = await createKnowledgeBaseEntry(WORKSPACE_ID, newData);

      expect(mockApiPost).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/knowledge-base`, newData);
      expect(result.title).toBe('New Entry');
    });

    it('should throw on validation error', async () => {
      mockApiPost.mockRejectedValue(new Error('Validation failed'));

      await expect(createKnowledgeBaseEntry(WORKSPACE_ID, {})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateKnowledgeBaseEntry', () => {
    it('should call apiPut with correct endpoint and data', async () => {
      const updateData = { severity: 'high' };
      mockApiPut.mockResolvedValue({ ...mockEntry, ...updateData });

      const result = await updateKnowledgeBaseEntry(WORKSPACE_ID, ENTRY_ID, updateData);

      expect(mockApiPut).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/knowledge-base/${ENTRY_ID}`, updateData);
      expect(result.severity).toBe('high');
    });
  });

  describe('deleteKnowledgeBaseEntry', () => {
    it('should call apiDelete with correct endpoint', async () => {
      mockApiDelete.mockResolvedValue(undefined);

      await deleteKnowledgeBaseEntry(WORKSPACE_ID, ENTRY_ID);

      expect(mockApiDelete).toHaveBeenCalledWith(`/api/v1/workspaces/${WORKSPACE_ID}/knowledge-base/${ENTRY_ID}`);
    });

    it('should throw on server error', async () => {
      mockApiDelete.mockRejectedValue(new Error('Server error'));

      await expect(deleteKnowledgeBaseEntry(WORKSPACE_ID, ENTRY_ID)).rejects.toThrow('Server error');
    });
  });
});
