/**
 * Quality Gates API module.
 *
 * Provides functions for managing quality gate configurations and evaluation results.
 * Quality gates define pass/fail criteria for scans and PRs.
 *
 * @example
 * ```ts
 * import { qualityGatesApi } from '@/modules/quality-gates/api';
 *
 * // Get current config
 * const config = await qualityGatesApi.getConfig('ws-123');
 *
 * // Update config
 * await qualityGatesApi.updateConfig('ws-123', {
 *   threshold: 'high',
 *   fail_on_critical: true,
 * });
 *
 * // Evaluate a scan
 * const result = await qualityGatesApi.evaluate('ws-123', { scanId: 'scan-456' });
 * ```
 */

import { apiFetch, apiPost, apiPut } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';

/**
 * Quality gate configuration for a workspace.
 */
export interface QualityGateConfig {
  /** Unique identifier */
  id: string;
  /** Workspace ID */
  workspace_id: string;
  /** Severity threshold for blocking */
  threshold: string;
  /** Whether to fail on critical findings */
  fail_on_critical: boolean;
  /** Whether to fail on high true-positive findings */
  fail_on_high_tp: boolean;
  /** Whether to warn on pending AI verification */
  warn_on_pending: boolean;
  /** Whether to require human acknowledgement */
  require_human_ack: boolean;
  /** How to handle pending findings */
  pending_behavior: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Quality gate evaluation result.
 */
export interface QualityGateResult {
  /** Unique identifier */
  id: string;
  /** Scan ID that was evaluated */
  scan_id: string;
  /** Evaluation status */
  status: 'passed' | 'failed' | 'warning';
  /** Number of blocking findings */
  blocking_findings: number;
  /** Number of pending findings */
  pending_findings: number;
  /** Evaluation timestamp */
  evaluated_at: string;
}

/**
 * Result of a quality gate evaluation.
 */
export interface EvaluateResult {
  /** Overall status */
  status: 'passed' | 'failed' | 'warning';
  /** Gate configuration used */
  gate: {
    threshold: string;
    fail_on_critical: boolean;
    fail_on_high_tp: boolean;
    warn_on_pending: boolean;
  };
  /** Finding counts */
  findings: {
    total: number;
    blocking: number;
    pending: number;
  };
  /** Evaluation result */
  result: QualityGateResult;
}

export const qualityGatesApi = {
  /**
   * Retrieve the quality gate configuration for a workspace.
   *
   * @param workspaceId - The workspace whose configuration to fetch
   * @returns The current quality gate configuration
   * @throws {ApiRequestError} When the request fails
   *
   * @example
   * ```ts
   * const config = await qualityGatesApi.getConfig('ws-abc123');
   * console.log(config.threshold);       // "medium"
   * console.log(config.fail_on_critical); // true
   * ```
   */
  getConfig: (workspaceId: string) =>
    apiFetch<QualityGateConfig>(ENDPOINTS.QUALITY_GATES.CONFIG, {
      params: { workspaceId },
    }),

  /**
   * Update the quality gate configuration for a workspace.
   *
   * @param workspaceId - The workspace to update
   * @param data - Partial configuration to update
   * @returns The updated configuration
   * @throws {ApiRequestError} On validation or server error
   *
   * @example
   * ```ts
   * const updated = await qualityGatesApi.updateConfig('ws-abc123', {
   *   threshold: 'high',
   *   fail_on_critical: true,
   * });
   * console.log(updated.threshold); // "high"
   * ```
   */
  updateConfig: (workspaceId: string, data: Partial<QualityGateConfig>) =>
    apiPut<QualityGateConfig>(ENDPOINTS.QUALITY_GATES.CONFIG, { workspaceId, ...data }),

  /**
   * Evaluate a scan against quality gate rules.
   *
   * @param workspaceId - The workspace ID
   * @param data - Evaluation request (scanId)
   * @returns Evaluation result
   * @throws {ApiRequestError} On server error
   *
   * @example
   * ```ts
   * const result = await qualityGatesApi.evaluate('ws-abc123', { scanId: 'scan-456' });
   * if (result.status === 'failed') {
   *   console.log(`Blocked by ${result.findings.blocking} findings`);
   * }
   * ```
   */
  evaluate: (workspaceId: string, data: { scanId: string }) =>
    apiPost<EvaluateResult>(ENDPOINTS.QUALITY_GATES.EVALUATE, { workspaceId, ...data }),

  /**
   * Get recent quality gate evaluation results.
   *
   * @param workspaceId - The workspace ID
   * @returns Array of evaluation results
   * @throws {ApiRequestError} On server error
   *
   * @example
   * ```ts
   * const { results } = await qualityGatesApi.getResults('ws-abc123');
   * results.forEach(r => {
   *   console.log(`Scan ${r.scan_id}: ${r.status}`);
   * });
   * ```
   */
  getResults: (workspaceId: string) =>
    apiFetch<{ results: QualityGateResult[] }>(ENDPOINTS.QUALITY_GATES.RESULTS, {
      params: { workspaceId },
    }),
};
