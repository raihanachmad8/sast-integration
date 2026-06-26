'use client';

import { Button, Card, Flex, theme, Typography } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import type { AiModelRow } from '@/commons/types/ai-models';
import { StatusPill } from '@/commons/components/StatusPill';
import { BORDER_RADIUS } from '@/commons/constants/layout';

const MODEL_ROLE = {
  PRIMARY: 'primary',
  FALLBACK: 'fallback',
} as const;

const ROLE_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = {
  [MODEL_ROLE.PRIMARY]: 'teal',
  [MODEL_ROLE.FALLBACK]: 'blue',
};

function roleLabel(role: string, index: number): string {
  if (role === MODEL_ROLE.PRIMARY) return 'Primary';
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

/**
 * Card displaying the AI model fallback chain with reorder, activate, and add controls.
 *
 * Shows primary and fallback models with drag-to-reorder and permission-gated management.
 *
 * @param props - {@link FallbackChainCardProps}
 * @returns JSX element rendering the fallback chain card with model list and actions.
 *
 * @example
 * <FallbackChainCard
 *   models={modelList}
 *   onMoveUp={(i) => moveUp(i)}
 *   onMoveDown={(i) => moveDown(i)}
 *   onSetActive={(id) => activateModel(id)}
 *   onAddFallback={() => openAddModal()}
 *   canManage={true}
 * />
 */
export function FallbackChainCard({ models, onMoveUp, onMoveDown, onSetActive, onAddFallback, canManage = true }: FallbackChainCardProps) {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={3} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Fallback chain</Typography.Title>
      <Flex vertical gap={token.padding}>
        {models.map((m, i) => {
          const isPrimary = m.role === MODEL_ROLE.PRIMARY;
          const label = roleLabel(m.role, i);
          return (
            <Flex key={m.id} align="center" gap={token.padding} style={{ padding: token.padding, border: isPrimary ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: isPrimary ? token.colorPrimaryBg : token.colorBgContainer }}>
              <span style={{ width: token.sizeLG, height: token.sizeLG, borderRadius: BORDER_RADIUS.CIRCLE, background: isPrimary ? token.colorPrimary : token.colorBorder, color: token.colorTextLightSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong, flexShrink: 0 }}>
                {i + 1}
              </span>
              <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ fontSize: token.fontSize, color: token.colorText }}>{m.name}</Typography.Text>
                <Typography.Text type="secondary" ellipsis style={{ fontSize: token.fontSizeSM }}>{m.provider}</Typography.Text>
              </Flex>
              <StatusPill variant={ROLE_VARIANT[m.role] ?? 'slate'}>{label}</StatusPill>
              <Flex gap={token.marginXXS} style={{ flexShrink: 0 }}>
                <Button disabled={!canManage || i === 0} onClick={() => onMoveUp(i)}>
                  <FaIcon icon="fa-arrow-up" />
                </Button>
                <Button disabled={!canManage || i === models.length - 1} onClick={() => onMoveDown(i)}>
                  <FaIcon icon="fa-arrow-down" />
                </Button>
                {!isPrimary && (
                  <Button type="primary" disabled={!canManage} onClick={() => onSetActive(m.id)}>
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
      <Button block disabled={!canManage} style={{ marginTop: token.paddingLG }} onClick={onAddFallback} icon={<FaIcon icon="fa-plus" />}>
        Add fallback
      </Button>
    </Card>
  );
}
