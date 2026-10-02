'use client';

import { useEffect } from 'react';
import { App, Button, Select, Switch, Card, Typography, Form, Row, Col, Flex, theme } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { FaIcon } from '@/components/shared/fa-icon';
import { GateResultsTable } from '@/features/quality-gates';
import { useSessionQuery } from '@/modules/auth/queries';
import { useQualityGateConfigQuery, useUpdateQualityGateMutation } from '@/modules/quality-gates/queries';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { qualityGateConfigSchema, type QualityGateConfigInput } from '@/commons/schemas';

export default function QualityGatesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const params = useParams<{ workspace: string }>();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const configQuery = useQualityGateConfigQuery(workspaceId);
  const updateMutation = useUpdateQualityGateMutation(workspaceId);

  const config = configQuery.data;

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<QualityGateConfigInput>({
    resolver: zodResolver(qualityGateConfigSchema),
    defaultValues: {
      fail_on_critical: true,
      fail_on_high_tp: true,
      warn_on_pending: true,
      require_human_ack: false,
      threshold: 'high',
      pending_behavior: 'warn',
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        fail_on_critical: config.fail_on_critical,
        fail_on_high_tp: config.fail_on_high_tp,
        warn_on_pending: config.warn_on_pending,
        require_human_ack: config.require_human_ack,
        threshold: config.threshold,
        pending_behavior: config.pending_behavior,
      });
    }
  }, [config, reset]);

  const handleSave = (values: QualityGateConfigInput) => {
    updateMutation.mutate(values, {
      onSuccess: () => message.success('Quality gate config saved'),
      onError: (err) => message.error(err.message),
    });
  };

  if (configQuery.isLoading) {
    return <LoadingState text="Loading quality gate config..." />;
  }

  return (
    <Flex vertical gap={token.marginXL}>
      <PageHeader
        title="Quality Gates"
        description="Define pass/fail criteria for PRs, releases, and scheduled checks."
        actions={
          <PermissionGate permission={PERMISSION.POLICY_MANAGE}>
            <Button type="primary" onClick={handleSubmit(handleSave)} loading={updateMutation.isPending} disabled={!isDirty}>
              <FaIcon icon="fa-check" /> Save gate
            </Button>
          </PermissionGate>
        }
      />

      <Row gutter={[16, 16]} align="top">
        {/* Main: Default PR Gate */}
        <Col flex="auto">
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginXS}px` }}>Default PR gate</Typography.Title>
          <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, margin: `0 0 ${token.marginXXL}px` }}>
            These rules apply to all pull request scans unless overridden by a project-level gate.
          </Typography.Paragraph>

          {/* Toggles */}
          <Flex vertical gap={token.marginLG} style={{ marginBottom: token.marginXXL }}>
            <Controller name="fail_on_critical" control={control} render={({ field }) => (
              <ToggleRow label="Fail on unresolved critical findings" description="Block merge if any critical finding remains open." checked={field.value} onChange={field.onChange} />
            )} />
            <Controller name="fail_on_high_tp" control={control} render={({ field }) => (
              <ToggleRow label="Fail on high findings verified as TP" description="Block merge if AI confirms a high-severity true positive." checked={field.value} onChange={field.onChange} />
            )} />
            <Controller name="warn_on_pending" control={control} render={({ field }) => (
              <ToggleRow label="Warn on pending AI verification" description="Show warning status if findings are still awaiting AI review." checked={field.value} onChange={field.onChange} />
            )} />
            <Controller name="require_human_ack" control={control} render={({ field }) => (
              <ToggleRow label="Require human acknowledgement" description="Require a reviewer to explicitly accept before merge." checked={field.value} onChange={field.onChange} />
            )} />
          </Flex>

          {/* Selects */}
          <Form layout="vertical">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
              <Form.Item label="Blocking threshold">
                <Controller name="threshold" control={control} render={({ field }) => (
                  <Select {...field} style={{ width: '100%' }} options={[{ value: 'critical', label: 'Critical only' }, { value: 'high', label: 'High and above' }, { value: 'medium', label: 'Medium and above' }, { value: 'low', label: 'Low and above' }]} />
                )} />
              </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
              <Form.Item label="Pending behavior">
                <Controller name="pending_behavior" control={control} render={({ field }) => (
                  <Select {...field} style={{ width: '100%' }} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
                )} />
              </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
        </Col>

        {/* Sidebar: Provider delivery info */}
        <Col xs={24} sm={24} flex="300px">
        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Typography.Title level={4} style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}px` }}>Provider delivery</Typography.Title>
          <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, margin: `0 0 ${token.marginLG}px`, lineHeight: 1.5 }}>
            Quality gate results are published back to the SCM provider as commit statuses and PR comments.
          </Typography.Paragraph>
          <Flex vertical gap={token.marginSM}>
            <InfoRow icon="fa-code-branch" label="Commit status" value="sast-integration/gate" />
            <InfoRow icon="fa-comment" label="PR comment" value="Summary + findings" />
            <InfoRow icon="fa-shield" label="Branch protection" value="Required to pass" />
          </Flex>

          <div style={{ marginTop: token.marginXXL, padding: token.paddingSM, background: token.colorBgLayout, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}`, fontSize: token.fontSizeSM, color: token.colorTextSecondary, lineHeight: 1.5 }}>
            Configure delivery options in <strong>Source Control → Pull request review output</strong>.
          </div>
        </Card>
        </Col>
      </Row>

      {/* Results section */}
      <section>
        <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginSM}px` }}>Recent evaluations</Typography.Title>
        <GateResultsTable workspaceId={workspaceId} />
      </section>
    </Flex>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { token } = theme.useToken();
  return (
    <Flex align="flex-start" gap={token.marginSM}>
      <Switch checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize, color: token.colorText }}>{label}</div>
        <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: token.marginXS }}>{description}</div>
      </div>
    </Flex>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={token.marginSM}>
      <FaIcon icon={icon} style={{ width: 16, color: token.colorTextSecondary, flexShrink: 0 }} />
      <Flex justify="space-between" style={{ flex: 1, fontSize: token.fontSize }}>
        <Typography.Text style={{ color: token.colorTextSecondary }}>{label}</Typography.Text>
        <Typography.Text strong style={{ color: token.colorText }}>{value}</Typography.Text>
      </Flex>
    </Flex>
  );
}
