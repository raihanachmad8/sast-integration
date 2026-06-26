'use client';

import { Card, Typography, Flex, theme } from 'antd';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  variant?: 'number' | 'statistic';
}

export function StatCard({ label, value, icon, color, variant = 'number' }: StatCardProps) {
  const { token } = theme.useToken();
  return (
    <Card size="small" style={{ height: '100%' }}>
      <Flex align="center" gap={token.paddingMD}>
        {icon && (
          <Flex align="center" justify="center" style={{ width: token.sizeXL, height: token.sizeXL, borderRadius: token.borderRadiusLG, backgroundColor: color ? `${color}15` : token.colorBgLayout }}>
            {icon}
          </Flex>
        )}
        <Flex vertical>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{label}</Typography.Text>
          {variant === 'number' ? (
            <div style={{ fontSize: token.fontSizeHeading2, fontWeight: token.fontWeightStrong, color }}>{value}</div>
          ) : (
            <Typography.Title level={4} style={{ margin: 0, color }}>{value}</Typography.Title>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
