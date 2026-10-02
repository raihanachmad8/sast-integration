/**
 * Report API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

import { apiFetch, apiPost, apiDelete } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { Report } from '@/commons/types';

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_REPORTS: Report[] = [
  { id: 'rpt_01', name: 'AI Verdict Summary — March 2025', type: 'ai_verdict_summary', range: 'Mar 1 – Mar 31, 2025', status: 'Generated', format: 'pdf', created: '2025-04-01' },
  { id: 'rpt_02', name: 'Detailed Findings — backend-api', type: 'detailed_findings', range: 'Last 30 days', status: 'Generated', format: 'xlsx', created: '2025-04-02' },
  { id: 'rpt_03', name: 'Executive Summary — Q1 2025', type: 'executive_summary', range: 'Jan 1 – Mar 31, 2025', status: 'Pending', format: 'pdf', created: '2025-04-03' },
];

export async function listReports(_workspaceId: string): Promise<Report[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_REPORTS;
  }
  return apiFetch<Report[]>(ENDPOINTS.REPORTS.LIST);
}

export async function generateReport(
  _workspaceId: string,
  _payload: { name: string; type: string; range: string; format: string }
): Promise<Report> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return {
      id: `rpt-${Date.now()}`,
      name: _payload.name,
      type: _payload.type as Report['type'],
      range: _payload.range,
      status: 'Generated',
      format: _payload.format as Report['format'],
      created: new Date().toISOString().split('T')[0],
    };
  }
  return apiPost<Report>(ENDPOINTS.REPORTS.LIST, _payload);
}

export async function deleteReport(_workspaceId: string, reportId: string): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(200);
    return { success: true };
  }
  return apiDelete<{ success: boolean }>(ENDPOINTS.REPORTS.DETAIL(reportId));
}
