'use client';

import { useState, useMemo } from 'react';
import { Modal, Select, Button, Typography, Row, Col, Flex, theme } from 'antd';
import type { Finding } from '@/commons/types';
import type { AiModelRow } from '@/commons/types/ai-models';
import { useAiModelsQuery } from '@/modules/ai-models';

const { Text } = Typography;

interface FindingActionsProps {
  finding: Finding;
  onOverrideVerdict?: (id: string, newVerdict: 'TP' | 'FP') => void;
  onDismiss?: (id: string) => void;
  onReverify?: (id: string, modelId: string) => void;
  onOpenFullPage?: (id: string) => void;
}

export function FindingActions({ finding, onOverrideVerdict, onDismiss, onReverify, onOpenFullPage }: FindingActionsProps) {
  const { token } = theme.useToken();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyModel, setReverifyModel] = useState<string>('');

  // Fetch available AI models from API
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

  const handleOverride = () => {
    onOverrideVerdict?.(finding.id, overrideVerdict);
    setOverrideOpen(false);
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
            <Button block onClick={() => setOverrideOpen(true)}>Mark as TP</Button>
          </Col>
          <Col span={12}>
            <Button block danger onClick={() => { setOverrideVerdict('FP'); setOverrideOpen(true); }}>Mark as FP</Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => onDismiss?.(finding.id)}>Dismiss</Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => setReverifyOpen(true)}>Re-verify with AI</Button>
          </Col>
          {onOpenFullPage && (
            <Col span={12}>
              <Button block onClick={() => onOpenFullPage(finding.id)}>Open full page</Button>
            </Col>
          )}
        </Row>
      </Flex>

      <Modal title="Confirm Verdict" open={overrideOpen} destroyOnHidden onOk={handleOverride} onCancel={() => setOverrideOpen(false)} okText="Confirm" okButtonProps={{ danger: overrideVerdict === 'FP' }}>
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Mark <strong>{finding.rule}</strong> as {overrideVerdict}?</Text>
          <Select value={overrideVerdict} onChange={setOverrideVerdict} style={{ width: '100%' }} options={[
            { value: 'TP', label: 'True Positive (TP) — confirmed issue' },
            { value: 'FP', label: 'False Positive (FP) — not a real issue' },
          ]} />
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
