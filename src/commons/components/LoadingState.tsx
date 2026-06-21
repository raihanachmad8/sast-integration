'use client';

import { Spin, theme } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingStateProps {
  text?: string;
  size?: 'small' | 'default' | 'medium' | 'large';
  fullHeight?: boolean;
  compact?: boolean;
}

/**
 * Standardized loading state component.
 *
 * @example
 * <LoadingState />
 * <LoadingState text="Saving changes..." size="small" />
 * <LoadingState fullHeight text="Loading workspace..." />
 */
export function LoadingState({ text = 'Loading...', size = 'medium', fullHeight = false, compact = false }: LoadingStateProps) {
  const { token } = theme.useToken();
  const padding = compact ? `${token.paddingSM}px ${token.paddingXS}px` : `${token.paddingXL * 2}px ${token.paddingLG}px`;
  const minHeight = compact ? 80 : fullHeight ? '60vh' : 200;
  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 24;
  const spinSize = size === 'default' ? 'medium' : size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding, minHeight, gap: compact ? token.marginXS : token.marginMD }}>
      <Spin size={spinSize as 'small' | 'medium' | 'large'} indicator={<LoadingOutlined style={{ fontSize: iconSize }} spin />} />
      {text && <span style={{ color: token.colorTextDescription, fontSize: compact ? token.fontSizeSM : token.fontSize }}>{text}</span>}
    </div>
  );
}
