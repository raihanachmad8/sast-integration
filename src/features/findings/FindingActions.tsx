'use client';

import { useState } from 'react';
import { Modal, Select, Button, Typography, Row, Col, Flex, theme } from 'antd';
import type { Finding } from '@/commons/types';

const { Text } = Typography;

interface FindingActionsProps {
  finding: Finding;
  onAcceptVerdict?: (id: string) => void;
  onOverrideVerdict?: (id: string, newVerdict: 'TP' | 'FP') => void;
  onReverify?: (id: string, model: string) => void;
  onOpenFullPage?: (id: string) => void;
}

export function FindingActions({ finding, onAcceptVerdict, onOverrideVerdict, onReverify, onOpenFullPage }: FindingActionsProps) {
  const { token } = theme.useToken();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideVerdict, setOverrideVerdict] = useState<'TP' | 'FP'>('TP');
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyModel, setReverifyModel] = useState('GPT-4');

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
          <Select value={reverifyModel} onChange={setReverifyModel} style={{ width: '100%' }} options={[
            { value: 'GPT-4', label: 'GPT-4' },
            { value: 'Claude-3', label: 'Claude-3' },
            { value: 'Gemini Pro', label: 'Gemini Pro' },
          ]} />
        </Flex>
      </Modal>
    </>
  );
}
