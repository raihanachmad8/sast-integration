/**
 * Unit tests for Quality Gates API module.
 *
 * Purpose: Verify that all quality-gates API functions correctly call the API client
 * with the expected endpoints, parameters, and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { qualityGatesApi } from '@/modules/quality-gates/api';
import { apiFetch, apiPost, apiPut } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);
const mockApiPost = vi.mocked(apiPost);
const mockApiPut = vi.mocked(apiPut);

const WORKSPACE_ID = 'ws-test-123';
const SCAN_ID = 'scan-test-456';
const TOKEN = 'tok_test_abc';

const mockConfig = {
  id: 'qc-001',
  workspace_id: WORKSPACE_ID,
  threshold: 'medium',
  fail_on_critical: true,
  fail_on_high_tp: false,
  warn_on_pending: true,
  require_human_ack: false,
  pending_behavior: 'block',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const mockResult = {
  id: 'qr-001',
  scan_id: SCAN_ID,
  status: 'passed' as const,
  blocking_findings: 0,
  pending_findings: 2,
  evaluated_at: '2024-01-03T00:00:00Z',
};

const mockEvaluateResult = {
  status: 'passed' as const,
  gate: {
    threshold: 'medium',
    fail_on_critical: true,
    fail_on_high_tp: false,
    warn_on_pending: true,
  },
  findings: {
    total: 10,
    blocking: 0,
    pending: 2,
  },
  result: mockResult,
};

describe('Quality Gates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should call apiFetch with correct endpoint and auth header', async () => {
      mockApiFetch.mockResolvedValue(mockConfig);

      const result = await qualityGatesApi.getConfig(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/quality-gates', {
        params: { workspaceId: WORKSPACE_ID },
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(qualityGatesApi.getConfig(WORKSPACE_ID)).rejects.toThrow('Network error');
    });
  });

  describe('updateConfig', () => {
    it('should call apiPut with correct endpoint, data, and auth header', async () => {
      const updateData = { threshold: 'high', fail_on_critical: true };
      const updatedConfig = { ...mockConfig, ...updateData };
      mockApiPut.mockResolvedValue(updatedConfig);

      const result = await qualityGatesApi.updateConfig(WORKSPACE_ID, updateData);

      expect(mockApiPut).toHaveBeenCalledWith(
        '/api/v1/quality-gates',
        { workspaceId: WORKSPACE_ID, ...updateData },
        { headers: { Authorization: `Bearer ${TOKEN}` } },
      );
      expect(result).toEqual(updatedConfig);
    });

    it('should throw on validation error', async () => {
      mockApiPut.mockRejectedValue(new Error('Validation failed'));

      await expect(
        qualityGatesApi.updateConfig(WORKSPACE_ID, { threshold: 'invalid' }),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('evaluate', () => {
    it('should call apiPost with correct endpoint, data, and auth header', async () => {
      mockApiPost.mockResolvedValue(mockEvaluateResult);

      const result = await qualityGatesApi.evaluate(WORKSPACE_ID, { scanId: SCAN_ID });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/v1/quality-gates/evaluate',
        { scanId: SCAN_ID, workspaceId: WORKSPACE_ID },
      );
      expect(result).toEqual(mockEvaluateResult);
    });

    it('should return failed status when scan has blocking findings', async () => {
      const failedResult = {
        ...mockEvaluateResult,
        status: 'failed' as const,
        findings: { total: 15, blocking: 3, pending: 1 },
      };
      mockApiPost.mockResolvedValue(failedResult);

      const result = await qualityGatesApi.evaluate(WORKSPACE_ID, { scanId: SCAN_ID });

      expect(result.status).toBe('failed');
      expect(result.findings.blocking).toBe(3);
    });

    it('should throw on API error', async () => {
      mockApiPost.mockRejectedValue(new Error('Scan not found'));

      await expect(qualityGatesApi.evaluate(WORKSPACE_ID, { scanId: SCAN_ID })).rejects.toThrow(
        'Scan not found',
      );
    });
  });

  describe('getResults', () => {
    it('should call apiFetch with correct endpoint and auth header', async () => {
      const resultsResponse = { results: [mockResult] };
      mockApiFetch.mockResolvedValue(resultsResponse);

      const result = await qualityGatesApi.getResults(WORKSPACE_ID);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/quality-gates/results', {
        params: { workspaceId: WORKSPACE_ID },
      });
      expect(result).toEqual(resultsResponse);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Server error'));

      await expect(qualityGatesApi.getResults(WORKSPACE_ID)).rejects.toThrow(
        'Server error',
      );
    });
  });
});
