'use client';

import { Modal, Button, Typography, Row, Col, Flex, theme } from 'antd';
import { useState } from 'react';

import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Finding } from '@/commons/types';

const { Text } = Typography;

interface FindingActionsProps {
  finding: Finding;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
  onReverify?: (id: string) => void;
  onOpenFullPage?: (id: string) => void;
}

/**
 * Action buttons for a finding: dismiss, resolve, re-verify with AI model, or open full page.
 *
 * Includes confirmation modals for resolve/re-verify and permission-gated visibility.
 *
 * @param props - {@link FindingActionsProps}
 * @returns JSX element rendering the finding action buttons with confirmation modals.
 *
 * @example
 * <FindingActions
 *   finding={finding}
 *   onDismiss={(id) => dismissFinding(id)}
 *   onResolve={(id) => resolveFinding(id)}
 *   onReverify={(id) => reverifyFinding(id)}
 *   onOpenFullPage={(id) => navigateTo(id)}
 * />
 */
export function FindingActions({ finding, onDismiss, onResolve, onReverify, onOpenFullPage }: FindingActionsProps) {
  const { token } = theme.useToken();
  const [resolveOpen, setResolveOpen] = useState(false);

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  const handleResolve = () => {
    onResolve?.(finding.id);
    setResolveOpen(false);
  };

  return (
    <>
      <Flex vertical gap={token.marginSM}>
        <Text style={sectionTitleStyle}>Actions</Text>
        <Row gutter={[token.marginSM, token.marginSM]}>
          <Col span={12}>
            <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
              <Button block danger onClick={() => onDismiss?.(finding.id)}>Dismiss</Button>
            </PermissionGate>
          </Col>
          <Col span={12}>
            <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
              <Button block type="primary" onClick={() => setResolveOpen(true)}>Resolve</Button>
            </PermissionGate>
          </Col>
          <Col span={12}>
            <PermissionGate permission={PERMISSION.FINDING_OVERRIDE_AI}>
              <Button block onClick={() => onReverify?.(finding.id)}>Re-verify with AI</Button>
            </PermissionGate>
          </Col>
          {onOpenFullPage && (
            <Col span={12}>
              <Button block onClick={() => onOpenFullPage(finding.id)}>Open full page</Button>
            </Col>
          )}
        </Row>
      </Flex>

      <Modal
        title="Resolve Finding"
        open={resolveOpen}
        destroyOnHidden
        onOk={handleResolve}
        onCancel={() => setResolveOpen(false)}
        okText="Resolve"
        okButtonProps={{ type: 'primary' }}
      >
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Resolve <strong>{finding.rule}</strong> as not an issue?</Text>
          <Text type="secondary">This marks the finding as resolved. It will not block the quality gate.</Text>
        </Flex>
      </Modal>
    </>
  );
}