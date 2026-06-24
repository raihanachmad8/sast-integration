'use client';

import { Button, Card, Flex, theme, Typography } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import type { AiModelRow } from '@/commons/types/ai-models';
import { StatusPill } from '@/commons/components/StatusPill';

const ROLE_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = {
  primary: 'teal',
  fallback: 'blue',
};

function roleLabel(role: string, index: number): string {
  if (role === 'primary') return 'Primary';
  return `Fallback ${index}`;
}

interface FallbackChainCardProps {
  models: AiModelRow[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetActive: (modelId: string) => void;
  onAddFallback: () => void;
  canManage?: boolean;
}

export function FallbackChainCard({ models, onMoveUp, onMoveDown, onSetActive, onAddFallback, canManage = true }: FallbackChainCardProps) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Fallback chain</Typography.Title>
      <Flex vertical gap={token.padding}>
        {models.map((m, i) => {
          const isPrimary = m.role === 'primary';
          const label = roleLabel(m.role, i);
          return (
            <Flex key={m.id} align="center" gap={token.padding} style={{ padding: token.padding, border: isPrimary ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: isPrimary ? token.colorPrimaryBg : token.colorBgContainer }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: isPrimary ? token.colorPrimary : token.colorBorder, color: token.colorTextLightSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0 }}>
                {i + 1}
              </span>
              <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ fontSize: token.fontSize, color: token.colorText }}>{m.name}</Typography.Text>
                <Typography.Text type="secondary" ellipsis style={{ fontSize: token.fontSizeSM }}>{m.provider}</Typography.Text>
              </Flex>
              <StatusPill variant={ROLE_VARIANT[m.role] ?? 'slate'}>{label}</StatusPill>
              <Flex gap={token.marginXXS} style={{ flexShrink: 0 }}>
                <Button size="small" disabled={!canManage || i === 0} onClick={() => onMoveUp(i)}>
                  <FaIcon icon="fa-arrow-up" />
                </Button>
                <Button size="small" disabled={!canManage || i === models.length - 1} onClick={() => onMoveDown(i)}>
                  <FaIcon icon="fa-arrow-down" />
                </Button>
                {!isPrimary && (
                  <Button size="small" type="primary" disabled={!canManage} onClick={() => onSetActive(m.id)}>
                    Set Active
                  </Button>
                )}
                {isPrimary && (
                  <StatusPill variant="teal">Active</StatusPill>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Flex>
      <Button size="small" block disabled={!canManage} style={{ marginTop: token.paddingLG }} onClick={onAddFallback} icon={<FaIcon icon="fa-plus" />}>
        Add fallback
      </Button>
    </Card>
  );
}
