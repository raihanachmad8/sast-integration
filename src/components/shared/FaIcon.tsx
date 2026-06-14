'use client';

import type { CSSProperties } from 'react';

interface FaIconProps {
  icon: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Reusable Font Awesome icon renderer.
 * Centralized so all shared components use the exact same icon implementation.
 *
 * @example
 * <FaIcon icon="fa-folder-open" />
 *
 * @example
 * <FaIcon icon="fa-exclamation-triangle" style={{ color: '#ff4d4f', fontSize: 48 }} />
 */
export function FaIcon({ icon, className, style }: FaIconProps) {
  return (
    <i
      className={`fa-solid ${icon} ${className ?? ''}`.trim()}
      aria-hidden="true"
      style={style}
    />
  );
}
