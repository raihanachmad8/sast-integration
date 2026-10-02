'use client';

import { Tag, theme } from 'antd';
import { getStatusToken, type StatusType } from '@/commons/tokens';

interface StatusTagProps {
  type: StatusType;
  value: string;
}

const LABEL_MAP: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  TP: 'TP',
  FP: 'FP',
  Pending: 'Pending',
  open: 'Open',
  accepted: 'Accepted',
  needs_review: 'Needs review',
  fixed: 'Fixed',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
  active: 'Active',
  inactive: 'Inactive',
  owner: 'Owner',
  manager: 'Manager',
  reviewer: 'Reviewer',
  member: 'Member',
};

/**
 * Reusable status tag with consistent color scheme.
 *
 * @example
 * <StatusTag type="severity" value="critical" />
 * <StatusTag type="verdict" value="TP" />
 * <StatusTag type="scanStatus" value="Running" />
 * <StatusTag type="scanner" value="Semgrep" />
 */
export function StatusTag({ type, value }: StatusTagProps) {
  const { token } = theme.useToken();
  const { color, bg } = getStatusToken(type, value);
  const label = LABEL_MAP[value] ?? value;

  return (
    <Tag
      style={{
        color,
        background: bg,
        border: `1px solid ${color}20`,
        borderRadius: token.borderRadiusSM,
        margin: 0,
      }}
    >
      {label}
    </Tag>
  );
}
