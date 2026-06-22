'use client';

import { Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  children: ReactNode;
  vertical?: boolean;
}

/**
 * Key-value display row - reusable for detail views.
 * Used in: Detail drawers, settings forms, etc.
 *
 * @example
 * <InfoRow label="Email">user@example.com</InfoRow>
 *
 * @example
 * <InfoRow label="Role" vertical>
 *   <StatusPill variant="blue">Manager</StatusPill>
 * </InfoRow>
 */
export function InfoRow({ label, children, vertical = false }: InfoRowProps) {
  const { token } = theme.useToken();
  
  if (vertical) {
    return (
      <Flex vertical gap={token.marginXXS}>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{label}</Typography.Text>
        {children}
      </Flex>
    );
  }
  
  return (
    <Flex justify="space-between" align="center" gap={token.marginMD}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      {children}
    </Flex>
  );
}
