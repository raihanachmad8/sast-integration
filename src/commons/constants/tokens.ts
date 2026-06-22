/**
 * Entity color maps — single source of truth for status indicators.
 *
 * All colors are hardcoded hex values because Ant Design tokens
 * (via theme.useToken()) do not cover entity-specific color mappings.
 *
 * Usage:
 *   import { ENTITY_COLORS, getStatusColor } from '@/commons/constants/tokens';
 *
 *   // Direct access
 *   const { color, bg } = ENTITY_COLORS.severity.critical;
 *
 *   // Helper with fallback
 *   const { color, bg } = getStatusColor('severity', 'critical');
 */

// ─── Entity Color Maps ─────────────────────────────────────────────

export const ENTITY_COLORS = {
  severity: {
    critical: { color: '#dc2626', bg: '#fef2f2' },
    high: { color: '#ea580c', bg: '#fff7ed' },
    medium: { color: '#d97706', bg: '#fffbeb' },
    low: { color: '#0ea5e9', bg: '#f0f9ff' },
    info: { color: '#6b7280', bg: '#f9fafb' },
  },
  verdict: {
    TP: { color: '#dc2626', bg: '#fef2f2' },
    FP: { color: '#16a34a', bg: '#f0fdf4' },
    Pending: { color: '#d97706', bg: '#fffbeb' },
  },
  findingStatus: {
    open: { color: '#dc2626', bg: '#fef2f2' },
    dismissed: { color: '#0d9488', bg: '#f0fdfa' },
    resolved: { color: '#16a34a', bg: '#f0fdf4' },
  },
  scanner: {
    Semgrep: { color: '#0f766e', bg: '#f0fdfa' },
    Gitleaks: { color: '#7c3aed', bg: '#faf5ff' },
    Flawfinder: { color: '#ea580c', bg: '#fff7ed' },
    Trivy: { color: '#0ea5e9', bg: '#f0f9ff' },
    Cppcheck: { color: '#6b7280', bg: '#f9fafb' },
    Sarif: { color: '#6b7280', bg: '#f9fafb' },
  },
  scanStatus: {
    Queued: { color: '#6b7280', bg: '#f9fafb' },
    Running: { color: '#3b82f6', bg: '#eff6ff' },
    Processing: { color: '#2563eb', bg: '#eff6ff' },
    Parsing: { color: '#7c3aed', bg: '#f5f3ff' },
    Completed: { color: '#16a34a', bg: '#f0fdf4' },
    Failed: { color: '#dc2626', bg: '#fef2f2' },
  },
  connectionStatus: {
    connected: { color: '#16a34a', bg: '#f0fdf4' },
    disconnected: { color: '#6b7280', bg: '#f9fafb' },
    error: { color: '#dc2626', bg: '#fef2f2' },
    needs_refresh: { color: '#d97706', bg: '#fffbeb' },
  },
  memberRole: {
    owner: { color: '#0f766e', bg: '#f0fdfa' },
    manager: { color: '#3b82f6', bg: '#eff6ff' },
    reviewer: { color: '#7c3aed', bg: '#faf5ff' },
    member: { color: '#6b7280', bg: '#f9fafb' },
  },
  repoStatus: {
    active: { color: '#16a34a', bg: '#f0fdf4' },
    inactive: { color: '#6b7280', bg: '#f9fafb' },
    error: { color: '#dc2626', bg: '#fef2f2' },
  },
  healthVariant: {
    teal: { color: '#0f766e', bg: '#f0fdfa' },
    amber: { color: '#d97706', bg: '#fffbeb' },
    purple: { color: '#7c3aed', bg: '#faf5ff' },
  },
  knowledgeSource: {
    CWE: { color: '#3b82f6', bg: '#eff6ff' },
    NVD: { color: '#7c3aed', bg: '#faf5ff' },
    MITRE: { color: '#d97706', bg: '#fffbeb' },
    Custom: { color: '#0f766e', bg: '#f0fdfa' },
  },
  provider: {
    github: { color: '#24292e', bg: '#f6f8fa' },
    gitlab: { color: '#fc6d26', bg: '#fff4ed' },
    gitea: { color: '#478061', bg: '#e6f7ef' },
  },
} as const;

// ─── Types ─────────────────────────────────────────────────────────

export type Verdict = keyof typeof ENTITY_COLORS.verdict;
export type FindingStatus = keyof typeof ENTITY_COLORS.findingStatus;
export type Scanner = keyof typeof ENTITY_COLORS.scanner;
export type ScanStatus = keyof typeof ENTITY_COLORS.scanStatus;
export type ConnectionStatus = keyof typeof ENTITY_COLORS.connectionStatus;
export type MemberRole = keyof typeof ENTITY_COLORS.memberRole;
export type RepoStatus = keyof typeof ENTITY_COLORS.repoStatus;
export type Provider = keyof typeof ENTITY_COLORS.provider;

/** All entity color map keys */
export type EntityType = keyof typeof ENTITY_COLORS;

/** Alias for backward compatibility with stash-imported components */
export const STATUS_TOKENS = ENTITY_COLORS;

// ─── Helpers ───────────────────────────────────────────────────────

const DEFAULT_COLOR = { color: '#6b7280', bg: '#f9fafb' };

/**
 * Get entity color with fallback to default.
 *
 * @param type - Entity category (e.g., 'severity', 'verdict')
 * @param key - Entity value (e.g., 'critical', 'TP')
 * @returns Color pair with hex color and background
 *
 * @example
 * getStatusColor('severity', 'critical')  // { color: '#dc2626', bg: '#fef2f2' }
 * getStatusColor('severity', 'unknown')   // { color: '#6b7280', bg: '#f9fafb' }
 */
export function getStatusColor(
  type: EntityType,
  key: string,
): { color: string; bg: string } {
  const map = ENTITY_COLORS[type];
  return map[key as keyof typeof map] ?? DEFAULT_COLOR;
}
