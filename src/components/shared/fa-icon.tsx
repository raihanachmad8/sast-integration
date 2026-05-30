'use client';

import type { CSSProperties } from 'react';

/**
 * Reusable Font Awesome icon renderer.
 * Centralized so all shared state components (EmptyState, ErrorState, banners)
 * use the exact same icon implementation.
 */
export function FaIcon({
  icon,
  className,
  style,
}: {
  icon: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <i
      className={`fa-solid ${icon} ${className ?? ''}`.trim()}
      aria-hidden="true"
      style={style}
    />
  );
}
