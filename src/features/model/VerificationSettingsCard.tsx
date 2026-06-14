'use client';

import { useState } from 'react';
import { App, Form, Select, Switch, Card, Typography, Row, Col, Flex, Button, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.paddingLG}>
      <Switch size="small" checked={checked} onChange={onChange} style={{ marginTop: 4 }} />
      <Flex vertical>
        <Typography.Text strong style={{ fontSize: token.fontSize, color: token.colorText }}>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: 4 }}>{description}</Typography.Text>
      </Flex>
    </Flex>
  );
}

export function VerificationSettingsCard() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [attachKnowledge, setAttachKnowledge] = useState(true);
  const [requireConfidence, setRequireConfidence] = useState(true);
  const [allowFallback, setAllowFallback] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    message.success('Verification settings saved');
    setHasChanges(false);
  };

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={3} style={{ fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Verification behavior</Typography.Title>
      <Flex vertical gap={token.paddingXL}>
        <ToggleRow
          label="Attach knowledge context"
          description="Include CWE, NVD, and custom workspace rules in AI verification prompts."
          checked={attachKnowledge}
          onChange={(v) => { setAttachKnowledge(v); setHasChanges(true); }}
        />
        <ToggleRow
          label="Require confidence for auto-accept"
          description="Only auto-suggest accept actions above the configured confidence threshold."
          checked={requireConfidence}
          onChange={(v) => { setRequireConfidence(v); setHasChanges(true); }}
        />
        <ToggleRow
          label="Allow fallback on timeout"
          description="Move to the next model when the primary verifier exceeds timeout."
          checked={allowFallback}
          onChange={(v) => { setAllowFallback(v); setHasChanges(true); }}
        />
      </Flex>

      <Form form={form} layout="vertical" onValuesChange={() => setHasChanges(true)}>
        <Row gutter={[16, 16]} style={{ marginTop: token.paddingXL }}>
          <Col xs={24} sm={8}>
            <Form.Item label="Confidence threshold" name="confidence" initialValue="90">
              <Select style={{ width: '100%' }} options={[{ value: '85', label: '85%' }, { value: '90', label: '90%' }, { value: '95', label: '95%' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Timeout" name="timeout" initialValue="90">
              <Select style={{ width: '100%' }} options={[{ value: '60', label: '60 sec' }, { value: '90', label: '90 sec' }, { value: '120', label: '120 sec' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="CWE mismatch" name="cweMismatch" initialValue="warn">
              <Select style={{ width: '100%' }} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Flex justify="flex-end" style={{ marginTop: token.paddingXL }}>
        <Button type="primary" onClick={handleSave} disabled={!hasChanges} icon={<FaIcon icon="fa-check" />}>
          Save settings
        </Button>
      </Flex>
    </Card>
  );
}
