'use client';

import { useEffect } from 'react';
import { App, Button, Select, Switch, Card, Typography, Form, Row, Col, Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { useSessionData } from '@/modules/auth/queries';
import { useQualityGateConfigQuery, useUpdateQualityGateMutation } from '@/modules/quality-gates';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { qualityGateConfigSchema } from '@/commons/schemas/quality-gate.schema';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { errorMessage } from '@/lib/api/errors';

export default function QualityGatesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionData();

  const gatesQuery = useQualityGateConfigQuery();
  const updateMutation = useUpdateQualityGateMutation();
  const [form] = Form.useForm();
  const rule = createZodSync(qualityGateConfigSchema);

  const gate = gatesQuery.data;

  useEffect(() => {
    if (gate) {
      form.setFieldsValue({
        fail_on_critical: gate.failOnCritical ?? false,
        fail_on_high_tp: gate.failOnHighTp ?? false,
        warn_on_pending: gate.warnOnPending ?? false,
        require_human_ack: gate.requireHumanAck ?? false,
        threshold: gate.threshold ?? 'high',
        pending_behavior: gate.pendingBehavior ?? 'warn',
      });
    }
  }, [gate, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate(values as QualityGateConfigInput, {
        onSuccess: () => message.success('Quality gate config saved'),
        onError: (err) => message.error(errorMessage(err)),
      });
    });
  };

  if (gatesQuery.isLoading) return <LoadingState text="Loading quality gate config..." />;
  if (gatesQuery.isError) return <ErrorState title="Failed to load config" description="Could not load quality gate configuration." />;

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Quality Gates"
        description="Define pass/fail criteria for PRs, releases, and scheduled checks."
        actions={
          <PermissionGate permission={PERMISSION.POLICY_MANAGE}>
            <Button type="primary" onClick={handleSave} loading={updateMutation.isPending} icon={<FaIcon icon="fa-check" />}>Save gate</Button>
          </PermissionGate>
        }
      />

      <Form form={form} layout="vertical">
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginXS}px` }}>Default PR gate</Typography.Title>
          <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, margin: `0 0 ${token.marginXL}px` }}>
            These rules apply to all pull request scans unless overridden by a project-level gate.
          </Typography.Paragraph>

          <Row gutter={[token.paddingXL, token.paddingLG]}>
            <Col xs={24} md={12}>
              <Flex vertical gap={token.marginLG}>
                <Form.Item name="fail_on_critical" valuePropName="checked" label="Fail on unresolved critical findings" extra="Block merge if any critical finding remains open." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="fail_on_high_tp" valuePropName="checked" label="Fail on high findings verified as TP" extra="Block merge if AI confirms a high-severity true positive." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="warn_on_pending" valuePropName="checked" label="Warn on pending AI verification" extra="Show warning status if findings are still awaiting AI review." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="require_human_ack" valuePropName="checked" label="Require human acknowledgement" extra="Require a reviewer to explicitly accept before merge." rules={[rule]}>
                  <Switch />
                </Form.Item>
              </Flex>
            </Col>
            <Col xs={24} md={12}>
              <Flex vertical gap={token.marginLG}>
                <Form.Item label="Blocking threshold" name="threshold" rules={[rule]}>
                  <Select options={[{ value: 'critical', label: 'Critical only' }, { value: 'high', label: 'High and above' }, { value: 'medium', label: 'Medium and above' }, { value: 'low', label: 'Low and above' }]} />
                </Form.Item>
                <Form.Item label="Pending behavior" name="pending_behavior" rules={[rule]}>
                  <Select options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
                </Form.Item>
              </Flex>
            </Col>
          </Row>
        </Card>
      </Form>

      <Card styles={{ body: { padding: token.paddingLG } }}>
        <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}px` }}>Recent evaluations</Typography.Title>
        <Flex vertical align="center" style={{ color: token.colorTextSecondary, padding: token.paddingXL }}>
          <FaIcon icon="fa-clipboard-check" style={{ fontSize: 32, marginBottom: token.marginMD, opacity: 0.4 }} />
          <Typography.Text type="secondary">No gate evaluations yet. Results appear after scans complete.</Typography.Text>
        </Flex>
      </Card>
    </Flex>
  );
}
