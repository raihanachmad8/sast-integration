'use client';

import { Card, Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}

/**
 * Card with title header - reusable for settings sections.
 * Used in: Profile security/audit tabs, Workspace settings, etc.
 *
 * @example
 * <SectionCard title="Security" extra={<Button>Change password</Button>}>
 *   <div>Security settings content</div>
 * </SectionCard>
 *
 * @example
 * <SectionCard title="Audit Log">
 *   <AuditLogTable />
 * </SectionCard>
 */
export function SectionCard({ title, children, extra }: SectionCardProps) {
  const { token } = theme.useToken();
  
  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Flex justify="space-between" align="center" style={{ padding: `${token.paddingMD}px ${token.paddingLG}px`, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Typography.Text strong>{title}</Typography.Text>
        {extra}
      </Flex>
      {children}
    </Card>
  );
}
