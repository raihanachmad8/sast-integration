import { qualityGateRepository } from '../repositories/quality-gate.repository';
import { findingRepository } from '../repositories/finding.repository';
import { AppError } from '@/server/http/errors';

/**
 * Quality gate service for evaluating scan results against configured rules.
 *
 * Quality gates determine whether a scan passes or fails based on:
 * - Severity thresholds (block if findings above threshold)
 * - AI verification status (block if pending findings)
 * - Human acknowledgement requirements
 */
export const qualityGateService = {
  /**
   * Get quality gate configuration for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @returns Quality gate config
   */
  async getConfig(workspaceId: string) {
    let gate = await qualityGateRepository.findByWorkspace(workspaceId);

    // Create default config if none exists
    if (!gate) {
      gate = await qualityGateRepository.upsert(workspaceId, {
        threshold: 'high',
        fail_on_critical: true,
        fail_on_high_tp: true,
        warn_on_pending: true,
        require_human_ack: false,
        pending_behavior: 'warn',
      });
    }

    return gate;
  },

  /**
   * Update quality gate configuration.
   *
   * @param workspaceId - Workspace UUID
   * @param data - Updated settings
   * @returns Updated config
   */
  async updateConfig(workspaceId: string, data: {
    threshold?: string;
    fail_on_critical?: boolean;
    fail_on_high_tp?: boolean;
    warn_on_pending?: boolean;
    require_human_ack?: boolean;
    pending_behavior?: string;
  }) {
    return qualityGateRepository.upsert(workspaceId, data);
  },

  /**
   * Evaluate quality gate for a scan.
   *
   * Checks findings against the gate rules and returns pass/fail/warning status.
   *
   * @param scanId - Scan UUID to evaluate
   * @param workspaceId - Workspace UUID for gate config
   * @returns Evaluation result
   */
  async evaluate(scanId: string, workspaceId: string) {
    const gate = await this.getConfig(workspaceId);
    const findings = await findingRepository.listByProject(
      workspaceId,
      { scanId },
      1000
    );

    const blockingFindings = this.countBlockingFindings(findings, gate);
    const pendingFindings = this.countPendingFindings(findings, gate);

    let status: 'passed' | 'failed' | 'warning' = 'passed';

    // Check blocking conditions
    if (gate.fail_on_critical && blockingFindings.critical > 0) {
      status = 'failed';
    } else if (gate.fail_on_high_tp && blockingFindings.high > 0) {
      status = 'failed';
    }

    // Check pending conditions
    if (gate.warn_on_pending && pendingFindings > 0) {
      if (status === 'passed') {
        status = gate.pending_behavior === 'fail' ? 'failed' : 'warning';
      }
    }

    // Save result
    const result = await qualityGateRepository.saveResult({
      scanId,
      gateId: gate.id,
      status,
      blockingFindings: blockingFindings.critical + blockingFindings.high,
      pendingFindings,
    });

    return {
      status,
      gate: {
        threshold: gate.threshold,
        fail_on_critical: gate.fail_on_critical,
        fail_on_high_tp: gate.fail_on_high_tp,
        warn_on_pending: gate.warn_on_pending,
      },
      findings: {
        total: findings.length,
        blocking: blockingFindings.critical + blockingFindings.high,
        pending: pendingFindings,
      },
      result,
    };
  },

  /**
   * Count findings that block the gate based on severity threshold.
   */
  countBlockingFindings(findings: Array<{ severity: string }>, gate: { threshold: string }) {
    const thresholdMap: Record<string, string[]> = {
      critical: ['critical'],
      high: ['critical', 'high'],
      medium: ['critical', 'high', 'medium'],
      low: ['critical', 'high', 'medium', 'low'],
    };

    const blockingSeverities = thresholdMap[gate.threshold] || ['critical'];

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      if (blockingSeverities.includes(f.severity)) {
        counts[f.severity as keyof typeof counts]++;
      }
    }

    return counts;
  },

  /**
   * Count findings pending AI verification.
   */
  countPendingFindings(findings: Array<{ status: string }>, _gate: unknown) {
    return findings.filter(f => f.status === 'open').length;
  },

  /**
   * List recent quality gate evaluation results for a workspace.
   *
   * @param workspaceId - Workspace UUID
   * @returns Array of evaluation results
   */
  async listResults(workspaceId: string) {
    return qualityGateRepository.listResultsByWorkspace(workspaceId);
  },
};
