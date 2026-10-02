/**
 * Unit tests for Scanner Engines API module.
 *
 * Purpose: Verify that scanner-engines API functions correctly call the API client
 * with the expected endpoints and handle responses/errors properly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listScannerEngines, getScannerRules } from '@/modules/scanner-engines/api';
import { apiFetch } from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

const SCANNER_ID = 'semgrep';

const mockEngines = [
  {
    name: 'semgrep',
    command: 'semgrep scan',
    format: 'json',
    outputStream: 'stdout',
    isAvailable: true,
    status: 'ready' as const,
  },
  {
    name: 'bandit',
    command: 'bandit -r',
    format: 'json',
    outputStream: 'stdout',
    isAvailable: false,
    status: 'not_installed' as const,
  },
];

const mockRulesResponse = {
  scanner: SCANNER_ID,
  rulesPath: '/rules/semgrep',
  totalCount: 150,
  rules: [
    {
      id: 'rule-001',
      name: 'SQL Injection',
      description: 'Detects SQL injection vulnerabilities',
      severity: 'critical',
      languages: ['python'],
      cwe: 'CWE-89',
      path: '/rules/semgrep/sql-injection.yaml',
      enabled: true,
    },
    {
      id: 'rule-002',
      name: 'XSS',
      description: 'Detects cross-site scripting vulnerabilities',
      severity: 'high',
      languages: ['javascript', 'typescript'],
      path: '/rules/semgrep/xss.yaml',
      enabled: true,
    },
  ],
  packs: ['p/owasp-top-ten', 'p/security-audit'],
};

describe('Scanner Engines API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listScannerEngines', () => {
    it('should call apiFetch with correct endpoint and return scanners array', async () => {
      mockApiFetch.mockResolvedValue({ scanners: mockEngines });

      const result = await listScannerEngines();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/scanner-engines');
      expect(result).toEqual(mockEngines);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no scanners are available', async () => {
      mockApiFetch.mockResolvedValue({ scanners: [] });

      const result = await listScannerEngines();

      expect(result).toEqual([]);
    });

    it('should throw on API error', async () => {
      mockApiFetch.mockRejectedValue(new Error('Service unavailable'));

      await expect(listScannerEngines()).rejects.toThrow('Service unavailable');
    });
  });

  describe('getScannerRules', () => {
    it('should call apiFetch with correct endpoint including scannerId', async () => {
      mockApiFetch.mockResolvedValue(mockRulesResponse);

      const result = await getScannerRules(SCANNER_ID);

      expect(mockApiFetch).toHaveBeenCalledWith(`/api/v1/scanner-engines/${SCANNER_ID}/rules`);
      expect(result).toEqual(mockRulesResponse);
      expect(result.totalCount).toBe(150);
    });

    it('should return rules with correct structure', async () => {
      mockApiFetch.mockResolvedValue(mockRulesResponse);

      const result = await getScannerRules(SCANNER_ID);

      expect(result.rules[0]).toHaveProperty('id', 'rule-001');
      expect(result.rules[0]).toHaveProperty('severity', 'critical');
      expect(result.rules[0]).toHaveProperty('cwe', 'CWE-89');
      expect(result.rules[1]).toHaveProperty('languages');
      expect(result.rules[1].languages).toContain('javascript');
    });

    it('should throw when scanner does not exist', async () => {
      mockApiFetch.mockRejectedValue(new Error('Scanner not found'));

      await expect(getScannerRules('nonexistent-scanner')).rejects.toThrow(
        'Scanner not found',
      );
    });

    it('should handle different scanner IDs correctly', async () => {
      mockApiFetch.mockResolvedValue(mockRulesResponse);

      await getScannerRules('bandit');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/scanner-engines/bandit/rules');

      await getScannerRules('trivy');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/scanner-engines/trivy/rules');
    });
  });
});
