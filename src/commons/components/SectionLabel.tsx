'use client';

import { theme } from 'antd';
import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  /** Render as a semantic heading element (default: span) */
  as?: 'span' | 'h3' | 'h4';
  className?: string;
}

/**
 * Uppercase section label for grouping content.
 * Used above form sections, settings groups, or card subdivisions.
 *
 * @example
 * <SectionLabel>General Settings</SectionLabel>
 *
 * @example
 * <SectionLabel as="h3">Danger Zone</SectionLabel>
 */
export function SectionLabel({ children, as: Tag = 'span', className }: SectionLabelProps) {
  const { token } = theme.useToken();

  return (
    <Tag
      className={className}
      style={{
        color: token.colorTextSecondary,
        fontSize: token.fontSizeSM,
        fontWeight: token.fontWeightStrong,
        letterSpacing: '0.14em',
        lineHeight: '16px',
        textTransform: 'uppercase',
        display: 'block',
        margin: 0,
      }}
    >
      {children}
    </Tag>
  );
}
