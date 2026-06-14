'use client';

import { Button, Card, Flex, theme, Typography } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import type { AiModelRow } from '@/commons/types/ai-models';
import { StatusPill } from '@/components/shared/StatusPill';

const ROLE_VARIANT: Record<string, string> = { Primary: 'teal', 'Fallback 1': 'blue', 'Fallback 2': 'amber' };

function roleForIndex(index: number): string {
  if (index === 0) return 'Primary';
  if (index === 1) return 'Fallback 1';
  return 'Fallback 2';
}

interface FallbackChainCardProps {
  models: AiModelRow[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSetActive: (modelId: string) => void;
  onAddFallback: () => void;
}

export function FallbackChainCard({ models, onMoveUp, onMoveDown, onSetActive, onAddFallback }: FallbackChainCardProps) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Fallback chain</Typography.Title>
      <Flex vertical gap={token.padding}>
        {models.map((m, i) => {
          const role = roleForIndex(i);
          const isActive = i === 0;
          return (
            <Flex key={m.id} align="center" gap={token.padding} style={{ padding: token.padding, border: isActive ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: isActive ? token.colorPrimaryBg : token.colorBgContainer }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: isActive ? token.colorPrimary : token.colorBorder, color: token.colorTextLightSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0 }}>
                {i + 1}
              </span>
              <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ fontSize: token.fontSize, color: token.colorText }}>{m.name}</Typography.Text>
                <Typography.Text type="secondary" ellipsis style={{ fontSize: token.fontSizeSM }}>{m.provider}</Typography.Text>
              </Flex>
              <StatusPill variant={(ROLE_VARIANT[role] ?? 'slate') as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{role}</StatusPill>
              <Flex gap={token.marginXXS} style={{ flexShrink: 0 }}>
                <Button size="small" disabled={i === 0} onClick={() => onMoveUp(i)}>
                  <FaIcon icon="fa-arrow-up" />
                </Button>
                <Button size="small" disabled={i === models.length - 1} onClick={() => onMoveDown(i)}>
                  <FaIcon icon="fa-arrow-down" />
                </Button>
                {!isActive && (
                  <Button size="small" type="primary" onClick={() => onSetActive(m.id)}>
                    Set Active
                  </Button>
                )}
                {isActive && (
                  <StatusPill variant="teal">Active</StatusPill>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Flex>
      <Button size="small" block style={{ marginTop: token.paddingLG }} onClick={onAddFallback} icon={<FaIcon icon="fa-plus" />}>
        Add fallback
      </Button>
    </Card>
  );
}
