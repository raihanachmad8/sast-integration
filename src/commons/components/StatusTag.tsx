'use client';

import { Tag, theme } from 'antd';
import { getStatusColor, type EntityType } from '@/commons/constants/tokens';

interface StatusTagProps {
  type: EntityType;
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
  dismissed: 'Dismissed',
  resolved: 'Resolved',
  Queued: 'Queued',
  Running: 'Running',
  Processing: 'Processing',
  Parsing: 'Parsing',
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
  const { color, bg } = getStatusColor(type, value);
  const label = LABEL_MAP[value] ?? value;

  return (
    <Tag
      style={{
        color,
        background: bg,
        border: `1px solid ${color}20`,
        borderRadius: token.borderRadiusSM,
        margin: 0,
        width: 'fit-content',
        display: 'inline-flex',
        alignSelf: 'flex-start',
      }}
    >
      {label}
    </Tag>
  );
}
