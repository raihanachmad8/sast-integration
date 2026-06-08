'use client';

import { Card, Typography, Flex, theme } from 'antd';
import type { DashboardHealth } from '@/modules/dashboard';
import { StatusPill } from '@/components/shared/StatusPill';

interface WorkspaceHealthProps {
  items: DashboardHealth[];
}

/**
 * Workspace health status panel.
 *
 * @example
 * <WorkspaceHealth items={healthItems} />
 */
export function WorkspaceHealth({ items }: WorkspaceHealthProps) {
  const { token } = theme.useToken();

  const variantStyles = {
    teal: { color: token.colorSuccess, bg: token.colorSuccessBg, border: token.colorSuccessBorder },
    amber: { color: token.colorWarning, bg: token.colorWarningBg, border: token.colorWarningBorder },
    purple: { color: token.colorPurple, bg: token.colorPurpleBg, border: token.colorPurpleBorder },
  } as const;

  return (
    <Card
      title="Workspace health"
      extra={<Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Last updated 2 min ago</Typography.Text>}
    >
      <Flex wrap="wrap" gap={token.marginMD}>
        {items.map((item, i) => {
          const style = variantStyles[item.variant];
          return (
            <div key={i} style={{ flex: '1 1 200px', border: `1px solid ${style.border}`, borderRadius: token.borderRadiusLG, background: style.bg, padding: `${token.paddingMD}px ${token.paddingLG}px` }}>
              <StatusPill variant={item.variant as 'teal' | 'amber' | 'purple'}>{item.status}</StatusPill>
              <div style={{ fontSize: token.fontSize, color: token.colorText }}>{item.label}</div>
            </div>
          );
        })}
      </Flex>
    </Card>
  );
}
