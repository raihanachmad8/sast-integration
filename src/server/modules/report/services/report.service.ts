import { reportRepository } from '../repositories/report.repository';
import { getStorageDriver } from '@/server/modules/storage/storage.service';
import { AppError } from '@/server/http/errors';

/**
 * Report generation types.
 */
export type ReportType = 'ai_verdict_summary' | 'detailed_findings' | 'executive_summary' | 'compliance_export';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv';

/**
 * Report service for generating and managing scan reports.
 *
 * Supports multiple report types:
 * - AI Verdict Summary: AI verification results overview
 * - Detailed Findings: Full finding list with details
 * - Executive Summary: High-level metrics for management
 * - Compliance Export: Structured data for compliance tools
 */
export const reportService = {
  /**
   * Generate a new report for a project.
   *
   * @param input - Report configuration
   * @returns Created report record
   */
  async generate(input: {
    workspaceId: string;
    projectId: string;
    type: ReportType;
    format: ReportFormat;
    title?: string;
    filters?: Record<string, unknown>;
    createdBy: string;
  }) {
    // Create report record
    const report = await reportRepository.create({
      workspace_id: input.workspaceId,
      type: input.type,
      title: input.title || `${input.type.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`,
      filters: input.filters ?? {},
      format: input.format,
      created_by: input.createdBy,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Get finding stats for the report
    const findingStats = await reportRepository.getFindingStats(input.projectId);
    const aiStats = await reportRepository.getAiVerificationStats(input.projectId);

    // Generate report content based on type
    let content: string;
    switch (input.type) {
      case 'ai_verdict_summary':
        content = this.generateAiVerdictSummary(findingStats, aiStats);
        break;
      case 'detailed_findings':
        content = this.generateDetailedFindings(findingStats);
        break;
      case 'executive_summary':
        content = this.generateExecutiveSummary(findingStats, aiStats);
        break;
      case 'compliance_export':
        content = this.generateComplianceExport(findingStats);
        break;
      default:
        content = this.generateExecutiveSummary(findingStats, aiStats);
    }

    // Upload to storage
    const storage = getStorageDriver();
    const fileName = `reports/${report.id}.${input.format}`;
    const buffer = Buffer.from(content, 'utf-8');
    const upload = await storage.upload(buffer, fileName, {
      contentType: input.format === 'pdf' ? 'application/pdf' : 'text/csv',
    });

    // Update report with file info
    await reportRepository.update(report.id, {
      file_path: upload.key,
      file_size: upload.size,
    });

    return {
      id: report.id,
      type: report.type,
      title: report.title,
      format: report.format,
      file_path: upload.key,
      created_at: report.created_at,
    };
  },

  /**
   * Get a report by ID.
   */
  async getById(reportId: string) {
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new AppError('Report not found', 404, 'NOT_FOUND');
    }
    return report;
  },

  /**
   * List reports for a workspace.
   */
  async list(workspaceId: string, limit = 25) {
    return reportRepository.listByWorkspace(workspaceId, limit);
  },

  /**
   * Generate AI Verdict Summary report content.
   */
  generateAiVerdictSummary(findingStats: Record<string, number>, aiStats: Record<string, number>): string {
    return [
      'AI Verification Summary',
      '========================',
      '',
      `Total Findings: ${findingStats.total}`,
      `Critical: ${findingStats.critical}`,
      `High: ${findingStats.high}`,
      `Medium: ${findingStats.medium}`,
      `Low: ${findingStats.low}`,
      '',
      'AI Verification Results:',
      `  Verified: ${aiStats.total}`,
      `  True Positives: ${aiStats.true_positive}`,
      `  False Positives: ${aiStats.false_positive}`,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
  },

  /**
   * Generate Detailed Findings report content.
   */
  generateDetailedFindings(findingStats: Record<string, number>): string {
    return [
      'Detailed Findings Report',
      '========================',
      '',
      `Total Findings: ${findingStats.total}`,
      `Open: ${findingStats.open}`,
      `Fixed: ${findingStats.fixed}`,
      `False Positive: ${findingStats.false_positive}`,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
  },

  /**
   * Generate Executive Summary report content.
   */
  generateExecutiveSummary(findingStats: Record<string, number>, aiStats: Record<string, number>): string {
    return [
      'Executive Summary',
      '================',
      '',
      `Total Findings: ${findingStats.total}`,
      `Critical: ${findingStats.critical}`,
      `AI Verified: ${aiStats.total}`,
      `True Positives: ${aiStats.true_positive}`,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
  },

  /**
   * Generate Compliance Export report content.
   */
  generateComplianceExport(findingStats: Record<string, number>): string {
    return [
      'severity,count',
      `critical,${findingStats.critical}`,
      `high,${findingStats.high}`,
      `medium,${findingStats.medium}`,
      `low,${findingStats.low}`,
    ].join('\n');
  },
};
