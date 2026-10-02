/**
 * E2E tests for Report generation flow.
 *
 * Tests the complete report lifecycle:
 * 1. Generate report with different types
 * 2. List reports for a workspace
 * 3. Get report by ID
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks ---

vi.mock('@/server/modules/report/repositories/report.repository', () => ({
  reportRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    listByWorkspace: vi.fn(),
    update: vi.fn(),
    getFindingStats: vi.fn(),
    getAiVerificationStats: vi.fn(),
  },
}));

vi.mock('@/server/modules/storage/storage.service', () => ({
  getStorageDriver: () => ({
    upload: vi.fn().mockResolvedValue({ key: 'reports/report-1.txt', size: 1024 }),
    getUrl: vi.fn(),
    delete: vi.fn(),
    isConfigured: vi.fn().mockReturnValue(true),
  }),
}));

import { reportService } from '@/server/modules/report/services/report.service';
import { reportRepository } from '@/server/modules/report/repositories/report.repository';

const mockReportRepo = vi.mocked(reportRepository);

describe('Report Generation E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock create to return the type that was passed in
    mockReportRepo.create.mockImplementation(async (data: Record<string, unknown>) =>
      mockValue({
        id: 'report-1',
        workspace_id: data.workspace_id,
        type: data.type,
        title: data.title,
        format: data.format,
        created_at: new Date(),
      })
    );
    mockReportRepo.getFindingStats.mockResolvedValue(mockValue({
      total: 45,
      critical: 3,
      high: 12,
      medium: 20,
      low: 10,
      open: 30,
      fixed: 10,
      false_positive: 5,
    }));
    mockReportRepo.getAiVerificationStats.mockResolvedValue(mockValue({
      total: 40,
      true_positive: 35,
      false_positive: 5,
    }));
    mockReportRepo.update.mockResolvedValue(undefined);
  });

  /**
   * Purpose: Verify that generating an executive summary report works.
   */
  it('should generate executive summary report', async () => {
    const report = await reportService.generate({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      type: 'executive_summary',
      format: 'csv',
      createdBy: 'user-1',
    });

    expect(report.id).toBe('report-1');
    expect(report.type).toBe('executive_summary');
    expect(mockReportRepo.create).toHaveBeenCalled();
    expect(mockReportRepo.update).toHaveBeenCalled();
  });

  /**
   * Purpose: Verify that generating an AI verdict summary report works.
   */
  it('should generate AI verdict summary report', async () => {
    const report = await reportService.generate({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      type: 'ai_verdict_summary',
      format: 'csv',
      createdBy: 'user-1',
    });

    expect(report.type).toBe('ai_verdict_summary');
  });

  /**
   * Purpose: Verify that generating a detailed findings report works.
   */
  it('should generate detailed findings report', async () => {
    const report = await reportService.generate({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      type: 'detailed_findings',
      format: 'csv',
      createdBy: 'user-1',
    });

    expect(report.type).toBe('detailed_findings');
    expect(report.format).toBe('csv');
  });

  /**
   * Purpose: Verify that generating a compliance export report works.
   */
  it('should generate compliance export report', async () => {
    const report = await reportService.generate({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      type: 'compliance_export',
      format: 'csv',
      createdBy: 'user-1',
    });

    expect(report.type).toBe('compliance_export');
  });
});

describe('Report List E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that listing reports returns reports for a workspace.
   */
  it('should list reports for a workspace', async () => {
    mockReportRepo.listByWorkspace.mockResolvedValue(mockValue([
      {
        id: 'report-1',
        type: 'executive_summary',
        title: 'Executive Summary',
        format: 'txt',
        created_at: new Date(),
      },
      {
        id: 'report-2',
        type: 'ai_verdict_summary',
        title: 'AI Verdict Summary',
        format: 'csv',
        created_at: new Date(),
      },
    ]));

    const reports = await reportService.list('ws-1');

    expect(reports).toHaveLength(2);
  });

  /**
   * Purpose: Verify that getting a report by ID works.
   */
  it('should get report by ID', async () => {
    mockReportRepo.findById.mockResolvedValue(mockValue({
      id: 'report-1',
      type: 'executive_summary',
      title: 'Executive Summary',
      format: 'txt',
      file_path: 'reports/report-1.txt',
    }));

    const report = await reportService.getById('report-1');

    expect(report.id).toBe('report-1');
    expect(report.file_path).toBe('reports/report-1.txt');
  });

  /**
   * Purpose: Verify that getting a non-existent report throws error.
   */
  it('should throw error for non-existent report', async () => {
    mockReportRepo.findById.mockResolvedValue(mockValue(null));

    await expect(reportService.getById('nonexistent')).rejects.toThrow('Report not found');
  });
});
