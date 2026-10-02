'use client';

import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingStateProps {
  /** Optional text to display below the spinner */
  text?: string;
  /** Size of the spinner */
  size?: 'small' | 'default' | 'large';
  /** Full height container (useful for page-level loading) */
  fullHeight?: boolean;
  /**
   * Compact mode for use inside cards, modals, or Suspense fallbacks.
   * Reduces padding and min-height to avoid layout shift in constrained containers.
   */
  compact?: boolean;
}

/**
 * Standardized loading state component.
 * Use this instead of raw <Spin /> for consistency across the app.
 *
 * - Use fullHeight for major page transitions.
 * - Use compact for small Suspense fallbacks inside auth cards or panels.
 */
export function LoadingState({
  text = 'Loading...',
  size = 'default',
  fullHeight = false,
  compact = false,
}: LoadingStateProps) {
  const padding = compact ? '16px 12px' : '48px 24px';
  const minHeight = compact ? '80px' : fullHeight ? '60vh' : '200px';
  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 24;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        minHeight,
        gap: compact ? 8 : 16,
      }}
    >
      <Spin
        size={size}
        indicator={<LoadingOutlined style={{ fontSize: iconSize }} spin />}
      />
      {text && (
        <span style={{ color: '#8c8c8c', fontSize: compact ? 12 : 14 }}>{text}</span>
      )}
    </div>
  );
}
