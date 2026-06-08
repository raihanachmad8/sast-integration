'use client';

import { useEffect } from 'react';
import { App, Button, Select, Switch, Card, Typography, Form, Row, Col, Flex, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { GateResultsTable } from '@/features/quality-gates';
import { useSessionQuery } from '@/modules/auth/queries';
import { useQualityGatesQuery, useUpdateQualityGateMutation } from '@/modules/quality-gates';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { LoadingState } from '@/components/shared/LoadingState';
import { qualityGateConfigSchema } from '@/commons/schemas/quality-gate.schema';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

/**
 * Quality Gates page — configure blocking rules for scan results.
 *
 * Routes: `/{workspaceSlug}/quality-gates`
 */
export default function QualityGatesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();

  const gatesQuery = useQualityGatesQuery();
  const updateMutation = useUpdateQualityGateMutation();
  const [form] = Form.useForm();
  const rule = createZodSync(qualityGateConfigSchema);

  const gate = gatesQuery.data?.[0];

  useEffect(() => {
    if (gate) {
      form.setFieldsValue({
        fail_on_critical: gate.failOnCritical,
        fail_on_high_tp: gate.failOnHighTp,
        warn_on_pending: gate.warnOnPending,
        require_human_ack: gate.requireHumanAck,
        threshold: gate.threshold,
        pending_behavior: gate.pendingBehavior,
      });
    }
  }, [gate, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      updateMutation.mutate(values as QualityGateConfigInput, {
        onSuccess: () => message.success('Quality gate config saved'),
        onError: (err: Error) => message.error(err.message),
      });
    });
  };

  if (gatesQuery.isLoading) return <LoadingState text="Loading quality gate config..." />;

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader title="Quality Gates" description="Define pass/fail criteria for PRs, releases, and scheduled checks."
        actions={<PermissionGate permission={PERMISSION.POLICY_MANAGE}>
          <Button type="primary" onClick={handleSave} loading={updateMutation.isPending} icon={<FaIcon icon="fa-check" />}>Save gate</Button>
        </PermissionGate>} />

      <Row gutter={[16, 16]} align="top">
        <Col flex="auto">
          <Card styles={{ body: { padding: token.paddingLG } }}>
            <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginXS}px` }}>Default PR gate</Typography.Title>
            <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, margin: `0 0 ${token.marginXXL}px` }}>
              These rules apply to all pull request scans unless overridden by a project-level gate.
            </Typography.Paragraph>

            <Flex vertical gap={token.marginLG} style={{ marginBottom: token.marginXXL }}>
              <ToggleRow label="Fail on unresolved critical findings" description="Block merge if any critical finding remains open." checked={form.getFieldValue('fail_on_critical')} onChange={(v) => form.setFieldsValue({ fail_on_critical: v })} />
              <ToggleRow label="Fail on high findings verified as TP" description="Block merge if AI confirms a high-severity true positive." checked={form.getFieldValue('fail_on_high_tp')} onChange={(v) => form.setFieldsValue({ fail_on_high_tp: v })} />
              <ToggleRow label="Warn on pending AI verification" description="Show warning status if findings are still awaiting AI review." checked={form.getFieldValue('warn_on_pending')} onChange={(v) => form.setFieldsValue({ warn_on_pending: v })} />
              <ToggleRow label="Require human acknowledgement" description="Require a reviewer to explicitly accept before merge." checked={form.getFieldValue('require_human_ack')} onChange={(v) => form.setFieldsValue({ require_human_ack: v })} />
            </Flex>

            <Form form={form} layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Blocking threshold" name="threshold" rules={[rule]}>
                    <Select options={[{ value: 'critical', label: 'Critical only' }, { value: 'high', label: 'High and above' }, { value: 'medium', label: 'Medium and above' }, { value: 'low', label: 'Low and above' }]} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Pending behavior" name="pending_behavior" rules={[rule]}>
                    <Select options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

      </Row>

      <section>
        <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}px` }}>Recent evaluations</Typography.Title>
        <GateResultsTable workspaceId={session.data?.workspace?.id ?? ''} />
      </section>
    </Flex>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.marginSM}>
      <Switch checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <Flex vertical>
        <Typography.Text strong style={{ fontSize: token.fontSize, color: token.colorText }}>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, marginTop: token.marginXS }}>{description}</Typography.Text>
      </Flex>
    </Flex>
  );
}


