'use client';

import { Card, Typography, Flex, theme } from 'antd';
import { StatusPill } from '@/components/shared/StatusPill';

interface HealthItem {
  label: string;
  value: number;
  ready: boolean;
}

interface WorkspaceHealthProps {
  items: HealthItem[];
}

/**
 * Workspace health status panel — server returns raw data, UI handles presentation.
 */
export function WorkspaceHealth({ items }: WorkspaceHealthProps) {
  const { token } = theme.useToken();

  return (
    <Card
      title="Workspace health"
      extra={<Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Last updated 2 min ago</Typography.Text>}
    >
      <Flex wrap="wrap" gap={token.marginMD}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 200px',
              border: `1px solid ${item.ready ? token.colorSuccessBorder : token.colorWarningBorder}`,
              borderRadius: token.borderRadiusLG,
              background: item.ready ? token.colorSuccessBg : token.colorWarningBg,
              padding: `${token.paddingMD}px ${token.paddingLG}px`,
            }}
          >
            <StatusPill variant={item.ready ? 'teal' : 'amber'}>{item.ready ? 'Ready' : 'Pending'}</StatusPill>
            <div style={{ fontSize: token.fontSize, color: token.colorText }}>{item.label}: {item.value}</div>
          </div>
        ))}
      </Flex>
    </Card>
  );
}
