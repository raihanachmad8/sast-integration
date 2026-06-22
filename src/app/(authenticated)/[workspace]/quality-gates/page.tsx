'use client';

import { useEffect } from 'react';
import { App, Button, Select, Switch, Card, Typography, Form, Row, Col, Flex, theme } from 'antd';
import { PageHeader } from '@/commons/components/PageHeader';
import { FaIcon } from '@/commons/components/FaIcon';
import { useQualityGateConfigQuery, useUpdateQualityGateMutation } from '@/modules/quality-gates';
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { LoadingState } from '@/commons/components/LoadingState';
import { ErrorState } from '@/commons/components/ErrorState';
import { qualityGateConfigSchema } from '@/commons/schemas/quality-gate.schema';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { errorMessage } from '@/lib/api/errors';
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';

export default function QualityGatesPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.QUALITY_GATES}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Quality Gates" description="Define pass/fail criteria for PRs, releases, and scheduled checks." />
          <ComingSoonCard
            icon="fa-clipboard-check"
            title="Quality Gates"
            description="Quality gates allow you to define pass/fail criteria for scans and PRs."
            envHint="FEATURE_FLAG_QUALITY_GATES"
          />
        </Flex>
      }
    >
      <QualityGatesPageContent />
    </FeatureGate>
  );
}

function QualityGatesPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const gatesQuery = useQualityGateConfigQuery();
  const updateMutation = useUpdateQualityGateMutation();
  const [form] = Form.useForm();
  const rule = createZodSync(qualityGateConfigSchema);

  const gate = gatesQuery.data;

  useEffect(() => {
    if (gate) {
      form.setFieldsValue({
        failOnCritical: gate.failOnCritical ?? false,
        failOnHighTp: gate.failOnHighTp ?? false,
        warnOnPending: gate.warnOnPending ?? false,
        requireHumanAck: gate.requireHumanAck ?? false,
        threshold: gate.threshold ?? 'high',
        pendingBehavior: gate.pendingBehavior ?? 'warn',
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
                <Form.Item name="failOnCritical" valuePropName="checked" label="Fail on unresolved critical findings" extra="Block merge if any critical finding remains open." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="failOnHighTp" valuePropName="checked" label="Fail on high findings verified as TP" extra="Block merge if AI confirms a high-severity true positive." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="warnOnPending" valuePropName="checked" label="Warn on pending AI verification" extra="Show warning status if findings are still awaiting AI review." rules={[rule]}>
                  <Switch />
                </Form.Item>
                <Form.Item name="requireHumanAck" valuePropName="checked" label="Require human acknowledgement" extra="Require a reviewer to explicitly accept before merge." rules={[rule]}>
                  <Switch />
                </Form.Item>
              </Flex>
            </Col>
            <Col xs={24} md={12}>
              <Flex vertical gap={token.marginLG}>
                <Form.Item label="Blocking threshold" name="threshold" rules={[rule]}>
                  <Select options={[{ value: 'critical', label: 'Critical only' }, { value: 'high', label: 'High and above' }, { value: 'medium', label: 'Medium and above' }, { value: 'low', label: 'Low and above' }]} />
                </Form.Item>
                <Form.Item label="Pending behavior" name="pendingBehavior" rules={[rule]}>
                  <Select options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
                </Form.Item>
              </Flex>
            </Col>
          </Row>
        </Card>
      </Form>

      <Card styles={{ body: { padding: token.paddingLG } }}>
        <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}px` }}>Evaluations</Typography.Title>
        <Flex vertical align="center" style={{ color: token.colorTextSecondary, padding: token.paddingXL }}>
          <FaIcon icon="fa-clipboard-check" style={{ fontSize: 32, marginBottom: token.marginMD, opacity: 0.4 }} />
          <Typography.Text type="secondary">Gate evaluations are shown in each scan&apos;s detail view.</Typography.Text>
        </Flex>
      </Card>
    </Flex>
  );
}
