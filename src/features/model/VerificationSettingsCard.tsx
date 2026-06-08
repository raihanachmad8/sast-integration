'use client';

import { Form, Select, Switch, Card, Typography, Row, Col, Flex, theme } from 'antd';

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.paddingLG}>
      <Switch size="small" defaultChecked={defaultChecked} style={{ marginTop: 4 }} />
      <Flex vertical>
        <Typography.Text strong style={{ fontSize: token.fontSize, color: token.colorText }}>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: 4 }}>{description}</Typography.Text>
      </Flex>
    </Flex>
  );
}

export function VerificationSettingsCard() {
  const { token } = theme.useToken();

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={3} style={{ fontSize: token.fontSizeLG, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.paddingXL}px` }}>Verification behavior</Typography.Title>
      <Flex vertical gap={token.paddingXL}>
        <ToggleRow
          label="Attach knowledge context"
          description="Include CWE, NVD, and custom workspace rules in AI verification prompts."
          defaultChecked
        />
        <ToggleRow
          label="Require confidence for auto-accept"
          description="Only auto-suggest accept actions above the configured confidence threshold."
          defaultChecked
        />
        <ToggleRow
          label="Allow fallback on timeout"
          description="Move to the next model when the primary verifier exceeds timeout."
          defaultChecked
        />
      </Flex>

      <Form layout="vertical">
        <Row gutter={[16, 16]} style={{ marginTop: token.paddingXL }}>
          <Col xs={24} sm={8}>
            <Form.Item label="Confidence threshold">
              <Select defaultValue="90" style={{ width: '100%' }} options={[{ value: '85', label: '85%' }, { value: '90', label: '90%' }, { value: '95', label: '95%' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Timeout">
              <Select defaultValue="90" style={{ width: '100%' }} options={[{ value: '60', label: '60 sec' }, { value: '90', label: '90 sec' }, { value: '120', label: '120 sec' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="CWE mismatch">
              <Select defaultValue="warn" style={{ width: '100%' }} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
