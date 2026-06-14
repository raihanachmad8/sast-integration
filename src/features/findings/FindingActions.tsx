'use client';

import { useState, useMemo } from 'react';
import { Modal, Select, Button, Typography, Row, Col, Flex, theme } from 'antd';
import type { Finding } from '@/commons/types';
import { useAiModelsQuery } from '@/modules/ai-models';

const { Text } = Typography;

interface FindingActionsProps {
  finding: Finding;
  onAcceptVerdict?: (id: string) => void;
  onOverrideVerdict?: (id: string, newVerdict: 'TP' | 'FP') => void;
  onReverify?: (id: string, modelId: string) => void;
  onOpenFullPage?: (id: string) => void;
}

export function FindingActions({ finding, onAcceptVerdict, onOverrideVerdict, onReverify, onOpenFullPage }: FindingActionsProps) {
  const { token } = theme.useToken();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyModel, setReverifyModel] = useState<string>('');

  // Fetch available AI models from API
  const { data: modelsData } = useAiModelsQuery({ page: 1, perPage: 100 });
  const modelOptions = useMemo(() => {
    const models = modelsData?.data ?? [];
    return models.map((m: any) => ({
      value: m.id,
      label: m.name || m.model || m.id,
    }));
  }, [modelsData]);

  // Set default model when options load
  useMemo(() => {
    if (modelOptions.length > 0 && !reverifyModel) {
      setReverifyModel(modelOptions[0].value);
    }
  }, [modelOptions, reverifyModel]);

  const sectionTitleStyle = {
    fontSize: token.fontSizeSM,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  };

  const handleAcceptVerdict = () => onAcceptVerdict?.(finding.id);

  const handleOverride = () => {
    onOverrideVerdict?.(finding.id, overrideVerdict);
    setOverrideOpen(false);
  };

  const handleReverify = () => {
    onReverify?.(finding.id, reverifyModel);
    setReverifyOpen(false);
  };

  return (
    <>
      <Flex vertical gap={token.marginSM}>
        <Text style={sectionTitleStyle}>Actions</Text>
        <Row gutter={[token.marginSM, token.marginSM]}>
          <Col span={12}>
            <Button type="primary" block onClick={handleAcceptVerdict}>Accept AI verdict</Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => setOverrideOpen(true)}>Override verdict</Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => setReverifyOpen(true)}>Re-verify</Button>
          </Col>
          <Col span={12}>
            <Button block onClick={() => onOpenFullPage?.(finding.id)}>Open full page</Button>
          </Col>
        </Row>
      </Flex>

      <Modal title="Override Verdict" open={overrideOpen} onOk={handleOverride} onCancel={() => setOverrideOpen(false)} okText="Override" okButtonProps={{ danger: overrideVerdict === 'FP' }}>
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Override the AI verdict for <strong>{finding.rule}</strong>?</Text>
          <Select value={overrideVerdict} onChange={setOverrideVerdict} style={{ width: '100%' }} options={[
            { value: 'TP', label: 'True Positive (TP)' },
            { value: 'FP', label: 'False Positive (FP)' },
          ]} />
        </Flex>
      </Modal>

      <Modal title="Re-verify" open={reverifyOpen} onOk={handleReverify} onCancel={() => setReverifyOpen(false)} okText="Start">
        <Flex vertical gap={token.marginSM} style={{ marginTop: token.marginMD }}>
          <Text>Select a model to re-verify <strong>{finding.rule}</strong>.</Text>
          <Select
            value={reverifyModel}
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
