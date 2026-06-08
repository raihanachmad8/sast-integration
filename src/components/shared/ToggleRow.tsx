'use client';

import { Switch, Typography, Flex, theme } from 'antd';

interface ToggleRowProps {
  label: string;
  description: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function ToggleRow({ label, description, checked, defaultChecked, onChange }: ToggleRowProps) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.paddingLG}>
      <Switch size="small" checked={checked} defaultChecked={defaultChecked} onChange={onChange} style={{ marginTop: 4 }} />
      <Flex vertical>
        <Typography.Text strong style={{ fontSize: token.fontSize, color: token.colorText }}>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: 4 }}>{description}</Typography.Text>
      </Flex>
    </Flex>
  );
}
