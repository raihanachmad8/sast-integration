/**
 * Findings API layer (mockable).
 *
 * When the backend is ready:
 *   1. Flip USE_MOCK_DATA to false
 *   2. Implement the real fetch versions
 *   3. The page/components do NOT need to change
 */

import { MOCK_FINDINGS, MOCK_MEMBER_LIST, MOCK_AI_MODELS } from '@/lib/mockData';
import type { Finding } from '@/commons/types';

const USE_MOCK_DATA = true;

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listFindings(): Promise<Finding[]> {
  if (USE_MOCK_DATA) {
    await delay(120);
    return MOCK_FINDINGS;
  }
  const res = await fetch('/api/v1/findings');
  const json = await res.json();
  return json.data;
}

export async function getFinding(id: string): Promise<Finding | null> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_FINDINGS.find((f) => f.id === id) ?? null;
  }
  const res = await fetch(`/api/v1/findings/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function updateFinding(id: string, payload: Partial<Finding>): Promise<Finding> {
  if (USE_MOCK_DATA) {
    await delay(200);
    const existing = MOCK_FINDINGS.find((f) => f.id === id);
    return { ...existing!, ...payload };
  }
  const res = await fetch(`/api/v1/findings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function bulkUpdateFindings(
  ids: string[],
  payload: Partial<Finding>
): Promise<{ updated: number }> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return { updated: ids.length };
  }
  const res = await fetch('/api/v1/findings/bulk', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, payload }),
  });
  return res.json();
}

export async function runAiVerification(
  findingIds: string[]
): Promise<{ queued: number }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return { queued: findingIds.length };
  }
  const res = await fetch('/api/v1/findings/ai-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findingIds }),
  });
  return res.json();
}

/** List workspace members for assignee selection. */
export async function listMembers(): Promise<Array<{ userId: string; name: string; email: string; initials: string; color: string }>> {
  if (USE_MOCK_DATA) {
    await delay(100);
    return MOCK_MEMBER_LIST.map((m, i) => ({
      userId: `u${i + 1}`,
      name: m.name,
      email: `${m.name.toLowerCase().replace(' ', '.')}@example.com`,
      initials: m.initials,
      color: m.color,
    }));
  }
  const res = await fetch('/api/v1/members');
  const json = await res.json();
  return json.data;
}

/** List available AI models for re-verification. */
export async function listModels(): Promise<Array<{ id: string; name: string }>> {
  if (USE_MOCK_DATA) {
    await delay(80);
    return MOCK_AI_MODELS;
  }
  const res = await fetch('/api/v1/model');
  const json = await res.json();
  return json.data;
}

// ============================================
// Helper Functions for UI Rendering
// ============================================

import { MOCK_COMMENTS, getMockScannerOutput, getMockSourceCode, getMockAiSuggestion } from '@/lib/mockData';
import type { FindingComment, ScannerEvidence } from '@/commons/types';

/** Mock comments for development. */
export { MOCK_COMMENTS };

/** Generate mock scanner output for a finding. */
export function getFindingScannerOutput(finding: Finding): ScannerEvidence[] {
  return getMockScannerOutput(finding);
}

/** Generate mock source code snippet for a finding. */
export function getFindingSourceCode(finding: Finding): string {
  return getMockSourceCode(finding);
}

/** Generate mock AI fix suggestion for a finding. */
export function getFindingAiSuggestion(finding: Finding): string {
  return getMockAiSuggestion(finding);
}

// ============================================
// Source Code Lines for UI Rendering
// ============================================

import { MOCK_SOURCE_LINES, MOCK_AI_SUGGESTION_CODE } from '@/lib/mockData';

/** Mock source code lines for findings detail view. */
export { MOCK_SOURCE_LINES, MOCK_AI_SUGGESTION_CODE };
