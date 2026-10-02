'use client';

import { Avatar, Space, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

/** Props for the IdentityCell component. */
interface IdentityCellProps {
  /** Primary text (name or email) */
  name: string;
  /** Secondary text (email or description) */
  subtitle: string;
  /** Avatar content — initials string or icon element */
  avatar: ReactNode;
  /** Avatar background color (CSS color value) */
  avatarColor?: string;
}

/**
 * Shared identity cell layout using Ant Design Avatar + Space.
 * Used in member tables, workspace cards, and dropdown menus.
 *
 * @param props - {@link IdentityCellProps}
 * @returns JSX element rendering a horizontal layout with avatar, primary text, and secondary text.
 *
 * @example
 * <IdentityCell
 *   name="John Doe"
 *   subtitle="john@example.com"
 *   avatar="JD"
 *   avatarColor={token.colorText}
 * />
 */
export function IdentityCell({ name, subtitle, avatar, avatarColor }: IdentityCellProps) {
  const { token } = theme.useToken();

  return (
    <Space size="middle" align="center">
      <Avatar style={avatarColor ? { background: avatarColor } : undefined} size={36}>
        {avatar}
      </Avatar>
      <div>
        <Text style={{ display: 'block', fontWeight: token.fontWeightStrong, fontSize: token.fontSize, color: token.colorText }}>{name}</Text>
        <Text style={{ display: 'block', fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{subtitle}</Text>
      </div>
    </Space>
  );
}
