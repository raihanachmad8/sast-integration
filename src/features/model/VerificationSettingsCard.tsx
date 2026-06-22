'use client';

import { useState, useEffect } from 'react';
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
  const { workspaceId } = useWorkspace();
  const api = Api({ baseUrl: clientEnv.apiUrl });
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [attachKnowledge, setAttachKnowledge] = useState(true);
  const [requireConfidence, setRequireConfidence] = useState(true);
  const [allowFallback, setAllowFallback] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttachKnowledge(query.data.attachKnowledge);
      setRequireConfidence(query.data.requireConfidence);
      setAllowFallback(query.data.allowFallback);
      form.setFieldsValue({
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

  const handleSave = async (values: { confidence: string; timeout: string; cweMismatch: string }) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await api.Put<ApiResponse<null>>(`/api/v1/workspaces/${workspaceId}/settings/verification`, {
        attachKnowledge,
        requireConfidence,
        allowFallback,
        confidenceThreshold: values.confidence,
        timeout: values.timeout,
        cweMismatch: values.cweMismatch,
      });
      message.success('Verification settings saved');
      setHasChanges(false);
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading) {
    return <Card styles={{ body: { padding: token.paddingXL } }}><Skeleton active paragraph={{ rows: 6 }} /></Card>;
  }

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

      <Form form={form} layout="vertical" onValuesChange={() => setHasChanges(true)} onFinish={handleSave}>
        <Row gutter={[16, 16]} style={{ marginTop: token.paddingXL }}>
          <Col xs={24} sm={8}>
            <Form.Item label="Confidence threshold" name="confidence" rules={[validateVerification]}>
              <Select style={{ width: '100%' }} options={[{ value: '85', label: '85%' }, { value: '90', label: '90%' }, { value: '95', label: '95%' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Timeout" name="timeout" rules={[validateVerification]}>
              <Select style={{ width: '100%' }} options={[{ value: '60', label: '60 sec' }, { value: '90', label: '90 sec' }, { value: '120', label: '120 sec' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="CWE mismatch" name="cweMismatch" rules={[validateVerification]}>
              <Select style={{ width: '100%' }} options={[{ value: 'warn', label: 'Warn' }, { value: 'fail', label: 'Fail' }, { value: 'ignore', label: 'Ignore' }]} />
            </Form.Item>
          </Col>
        </Row>

        <Flex justify="flex-end" style={{ marginTop: token.paddingXL }}>
          <Button type="primary" htmlType="submit" disabled={!hasChanges} loading={saving} icon={<FaIcon icon="fa-check" />}>
            Save settings
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
