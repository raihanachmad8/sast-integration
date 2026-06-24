'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { App, Form, Select, Switch, Card, Typography, Row, Col, Flex, Button, Skeleton, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import { createZodSync } from '@/lib/utils/zod-sync';
import { z } from 'zod';
import { usePermissions } from '@/lib/hooks/usePermissions';

const verificationSchema = z.object({
  confidence: z.string().min(1, 'Confidence threshold is required'),
  timeout: z.string().min(1, 'Timeout is required'),
  cweMismatch: z.string().min(1, 'CWE mismatch setting is required'),
});

const validateVerification = createZodSync(verificationSchema);

interface VerificationSettings {
  attachKnowledge: boolean;
  requireConfidence: boolean;
  allowFallback: boolean;
  confidenceThreshold: string;
  timeout: string;
  cweMismatch: string;
}

export function VerificationSettingsCard() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();
  const api = Api({ baseUrl: clientEnv.apiUrl });
  const { isAtLeast } = usePermissions();
  const canManage = isAtLeast('manager');
  const [form] = Form.useForm();
  const rule = createZodSync(verificationSchema);

  const query = useQuery<VerificationSettings>({
    queryKey: ['verification-settings', workspaceId],
    queryFn: async () => {
      const { data } = await api.Get<ApiResponse<VerificationSettings>>(ENDPOINTS.WORKSPACE_SETTINGS?.VERIFICATION?.(workspaceId!) ?? `/api/v1/workspaces/${workspaceId}/settings/verification`);
      if (!data) throw new Error('No data');
      return data;
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (query.data) {
      form.setFieldsValue({
        attachKnowledge: query.data.attachKnowledge,
        requireConfidence: query.data.requireConfidence,
        allowFallback: query.data.allowFallback,
        confidence: query.data.confidenceThreshold,
        timeout: query.data.timeout,
        cweMismatch: query.data.cweMismatch,
      });
    }
  }, [query.data, form]);

  useEffect(() => {
    if (query.error) {
      message.warning('Could not load verification settings');
    }
  }, [query.error, message]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (!workspaceId) return;
      api.Put<ApiResponse<null>>(`/api/v1/workspaces/${workspaceId}/settings/verification`, {
        attachKnowledge: values.attachKnowledge,
        requireConfidence: values.requireConfidence,
        allowFallback: values.allowFallback,
        confidenceThreshold: values.confidence,
        timeout: values.timeout,
        cweMismatch: values.cweMismatch,
      }).then(() => {
        message.success('Verification settings saved');
      }).catch(() => {
        message.error('Failed to save settings');
      });
    });
  };

  if (query.isLoading) {
    return <Card styles={{ body: { padding: token.paddingXL } }}><Skeleton active paragraph={{ rows: 6 }} /></Card>;
  }

  return (
    <Card styles={{ body: { padding: token.paddingXL } }}>
      <Typography.Title level={4} style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, margin: `0 0 ${token.marginXS}px` }}>Verification behavior</Typography.Title>
      <Typography.Paragraph style={{ color: token.colorTextSecondary, fontSize: token.fontSize, margin: `0 0 ${token.marginXL}px` }}>
        Configure how AI verification processes findings and applies verdicts.
      </Typography.Paragraph>

      <Form form={form} layout="vertical">
        <Row gutter={[token.paddingXL, token.paddingLG]}>
          <Col xs={24} md={12}>
            <Flex vertical gap={token.marginLG}>
              <Form.Item name="attachKnowledge" valuePropName="checked" label="Attach knowledge context" extra="Include CWE, NVD, and custom workspace rules in AI verification prompts." rules={[rule]}>
                <Switch disabled={!canManage} />
              </Form.Item>
              <Form.Item name="requireConfidence" valuePropName="checked" label="Require confidence for auto-accept" extra="Only auto-suggest accept actions above the configured confidence threshold." rules={[rule]}>
                <Switch disabled={!canManage} />
              </Form.Item>
              <Form.Item name="allowFallback" valuePropName="checked" label="Allow fallback on timeout" extra="Move to the next model when the primary verifier exceeds timeout." rules={[rule]}>
                <Switch disabled={!canManage} />
              </Form.Item>
            </Flex>
          </Col>
          <Col xs={24} md={12}>
            <Flex vertical gap={token.marginLG}>
              <Form.Item label="Confidence threshold" name="confidence" rules={[validateVerification]}>
                <Select disabled={!canManage} options={[{ value: '85', label: '85%' }, { value: '90', label: '90%' }, { value: '95', label: '95%' }]} />
              </Form.Item>
              <Form.Item label="Timeout" name="timeout" rules={[validateVerification]}>
                <Select disabled={!canManage} options={[{ value: '60', label: '60 sec' }, { value: '90', label: '90 sec' }, { value: '120', label: '120 sec' }]} />
              </Form.Item>
              <Form.Item label="CWE mismatch" name="cweMismatch" rules={[validateVerification]}>
                <Select disabled={!canManage} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
              </Form.Item>
            </Flex>
          </Col>
        </Row>

        <Flex justify="flex-end" style={{ marginTop: token.paddingXL }}>
          {canManage ? (
            <Button type="primary" onClick={handleSave} loading={query.isFetching} icon={<FaIcon icon="fa-check" />}>
              Save settings
            </Button>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              You need Manager or Owner role to modify verification settings.
            </Typography.Text>
          )}
        </Flex>
      </Form>
    </Card>
  );
}
