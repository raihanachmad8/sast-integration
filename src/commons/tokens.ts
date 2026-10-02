/**
 * Design tokens for status indicators.
 * All colors are used with matching background (bg) for light mode.
 */
export const STATUS_TOKENS = {
  severity: {
    critical: { color: '#dc2626', bg: '#fef2f2' },
    high: { color: '#ea580c', bg: '#fff7ed' },
    medium: { color: '#d97706', bg: '#fffbeb' },
    low: { color: '#0ea5e9', bg: '#f0f9ff' },
  },
  verdict: {
    TP: { color: '#dc2626', bg: '#fef2f2' },
    FP: { color: '#16a34a', bg: '#f0fdf4' },
    Pending: { color: '#d97706', bg: '#fffbeb' },
  },
  findingStatus: {
    open: { color: '#dc2626', bg: '#fef2f2' },
    accepted: { color: '#16a34a', bg: '#f0fdf4' },
    needs_review: { color: '#d97706', bg: '#fffbeb' },
    fixed: { color: '#6b7280', bg: '#f9fafb' },
  },
  scanner: {
    Semgrep: { color: '#0f766e', bg: '#f0fdfa' },
    Gitleaks: { color: '#7c3aed', bg: '#faf5ff' },
    Flawfinder: { color: '#ea580c', bg: '#fff7ed' },
    Trivy: { color: '#0ea5e9', bg: '#f0f9ff' },
    Cppcheck: { color: '#6b7280', bg: '#f9fafb' },
  },
  scanStatus: {
    Running: { color: '#3b82f6', bg: '#eff6ff' },
    Completed: { color: '#16a34a', bg: '#f0fdf4' },
    Failed: { color: '#dc2626', bg: '#fef2f2' },
    Pending: { color: '#d97706', bg: '#fffbeb' },
  },
  healthVariant: {
    teal: { color: '#0f766e', bg: '#f0fdfa' },
    amber: { color: '#d97706', bg: '#fffbeb' },
    purple: { color: '#7c3aed', bg: '#faf5ff' },
  },
  memberRole: {
    owner: { color: '#0f766e', bg: '#f0fdfa' },
    manager: { color: '#3b82f6', bg: '#eff6ff' },
    reviewer: { color: '#7c3aed', bg: '#faf5ff' },
    member: { color: '#6b7280', bg: '#f9fafb' },
  },
  connectionStatus: {
    connected: { color: '#16a34a', bg: '#f0fdf4' },
    disconnected: { color: '#6b7280', bg: '#f9fafb' },
    error: { color: '#dc2626', bg: '#fef2f2' },
  },
  repoStatus: {
    active: { color: '#16a34a', bg: '#f0fdf4' },
    inactive: { color: '#6b7280', bg: '#f9fafb' },
  },
  knowledgeSource: {
    CWE: { color: '#3b82f6', bg: '#eff6ff' },
    NVD: { color: '#7c3aed', bg: '#faf5ff' },
    MITRE: { color: '#d97706', bg: '#fffbeb' },
    'Custom Rules': { color: '#0f766e', bg: '#f0fdfa' },
  },
} as const;

export type Severity = keyof typeof STATUS_TOKENS.severity;
export type Verdict = keyof typeof STATUS_TOKENS.verdict;
export type FindingStatus = keyof typeof STATUS_TOKENS.findingStatus;
export type Scanner = keyof typeof STATUS_TOKENS.scanner;

export type StatusType = keyof typeof STATUS_TOKENS;

/**
 * Get status token with fallback to default.
 */
export function getStatusToken(
  type: StatusType,
  key: string,
): { color: string; bg: string } {
  const tokens = STATUS_TOKENS[type];
  const defaultToken = { color: '#6b7280', bg: '#f9fafb' };
  return tokens[key as keyof typeof tokens] ?? defaultToken;
}
