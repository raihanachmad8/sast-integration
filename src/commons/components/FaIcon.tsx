'use client';

import type { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { iconMap } from './icon-map';

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
 * <FaIcon icon="folder-open" />
 *
 * @example
 * <FaIcon icon="exclamation-triangle" style={{ color: '#ff4d4f', fontSize: 48 }} />
 */
export function FaIcon({ icon, className, style }: FaIconProps) {
  const faIcon = iconMap[icon];
  if (!faIcon) {
    console.warn(`Unknown icon: ${icon}`);
    return null;
  }
  return (
    <FontAwesomeIcon
      icon={faIcon}
      className={className}
      style={style}
    />
  );
}
