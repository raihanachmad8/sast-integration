'use client';

import { useState, useMemo } from 'react';
import { Modal, Select, Button, Typography, Row, Col, Flex, theme } from 'antd';
import type { Finding } from '@/commons/types';
import type { AiModelRow } from '@/commons/types/ai-models';
import { useAiModelsQuery } from '@/modules/ai-models';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

const { Text } = Typography;

interface FindingActionsProps {
  finding: Finding;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
  onReverify?: (id: string, modelId: string) => void;
  onOpenFullPage?: (id: string) => void;
}

export function FindingActions({ finding, onDismiss, onResolve, onReverify, onOpenFullPage }: FindingActionsProps) {
  const { token } = theme.useToken();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyModel, setReverifyModel] = useState<string>('');

  const { data: modelsData } = useAiModelsQuery({ page: 1, perPage: 100 });
  const modelOptions = useMemo(() => {
    const models = modelsData?.data ?? [];
    return models.map((m: AiModelRow) => ({
      value: m.id,
      label: m.name || m.id,
    }));
  }, [modelsData]);

  const effectiveReverifyModel = reverifyModel || modelOptions[0]?.value || '';

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

  const handleReverify = () => {
    const modelId = effectiveReverifyModel;
    if (!modelId) return;
    onReverify?.(finding.id, modelId);
    setReverifyOpen(false);
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
              <Button block onClick={() => setReverifyOpen(true)}>Re-verify with AI</Button>
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

      <Modal title="Re-verify with AI" open={reverifyOpen} destroyOnHidden onOk={handleReverify} onCancel={() => setReverifyOpen(false)} okText="Start">
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Select a model to re-verify <strong>{finding.rule}</strong>.</Text>
          <Select
            value={effectiveReverifyModel}
            onChange={setReverifyModel}
            style={{ width: '100%' }}
            options={modelOptions}
            placeholder="Select a model"
            notFoundContent="No models configured"
          />
        </Flex>
      </Modal>
    </>
  );
}
