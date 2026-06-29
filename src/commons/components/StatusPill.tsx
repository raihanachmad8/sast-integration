'use client';

import { Tag, theme } from 'antd';
import type { ReactNode } from 'react';

/** Available visual variants for the StatusPill. */
type PillVariant = 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';

/** Maps pill variants to Ant Design Tag color presets. */
const VARIANT_COLOR: Record<PillVariant, string> = {
  teal: 'teal',
  blue: 'blue',
  amber: 'gold',
  red: 'red',
  purple: 'purple',
  slate: 'default',
};

/** Props for the StatusPill component. */
interface StatusPillProps {
  /** Visual variant determining the pill's color scheme */
  variant: PillVariant;
  /** Pill text content */
  children: ReactNode;
  /** Whether the tag is closable (shows a close button) */
  closable?: boolean;
  /** Callback when the close button is clicked */
  onClose?: (e?: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Shared status/role pill badge using Ant Design Tag.
 *
 * @param props - {@link StatusPillProps}
 * @returns JSX element rendering a styled tag badge with the given variant and children.
 *
 * @example
 * <StatusPill variant="teal">Active</StatusPill>
 * <StatusPill variant="blue">Manager</StatusPill>
 * <StatusPill variant="amber">Pending</StatusPill>
 * <StatusPill variant="slate" closable onClose={() => removeFilter()}>Filter: value</StatusPill>
 */
export function StatusPill({ variant, children, closable, onClose }: StatusPillProps) {
  const { token } = theme.useToken();

  return (
    <Tag
      color={VARIANT_COLOR[variant] ?? 'default'}
      closable={closable}
      onClose={onClose}
      style={{ textTransform: 'uppercase', fontWeight: token.fontWeightStrong, fontSize: token.fontSizeSM, borderRadius: token.borderRadiusSM }}
    >
      {children}
    </Tag>
  );
}
