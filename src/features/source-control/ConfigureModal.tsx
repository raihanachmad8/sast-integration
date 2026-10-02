'use client';

import { useState, useEffect } from 'react';
import { Button, Modal, Input, Select, Form, App, Typography, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/fa-icon';
import { SectionLabel } from '@/components/shared/SectionLabel';

const { Text } = Typography;

const PROVIDERS = ['GitHub', 'GitLab', 'Gitea'];

const CONNECTION_MODES: Record<string, { value: string; label: string }[]> = {
  GitHub: [
    { value: 'github-app', label: 'GitHub App' },
    { value: 'oauth-app', label: 'OAuth app' },
    { value: 'pat', label: 'Personal token' },
  ],
  GitLab: [
    { value: 'oauth-app', label: 'OAuth app' },
    { value: 'pat', label: 'Personal token' },
  ],
  Gitea: [
    { value: 'oauth-app', label: 'OAuth app' },
    { value: 'pat', label: 'Personal token' },
  ],
};

const DEFAULT_URLS: Record<string, { base: string; api: string }> = {
  GitHub: { base: 'https://github.com', api: 'https://api.github.com' },
  GitLab: { base: 'https://gitlab.com', api: 'https://gitlab.com/api/v4' },
  Gitea: { base: 'https://gitea.io', api: 'https://gitea.io/api/v1' },
};

interface ConfigureModalProps {
  open: boolean;
  providerName: string;
  isConnected: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function ConfigureModal({ open, providerName, isConnected, onCancel, onSave }: ConfigureModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const provider = Form.useWatch('provider', form);
  const mode = Form.useWatch('mode', form);

  const modes = CONNECTION_MODES[provider] ?? CONNECTION_MODES.GitHub;
  const isGithubApp = mode === 'github-app';
  const isOAuth = mode === 'oauth-app';
  const isPat = mode === 'pat';

  useEffect(() => {
    if (open) {
      const p = providerName || 'GitHub';
      const m = CONNECTION_MODES[p]?.[0]?.value ?? '';
      form.setFieldsValue({
        provider: p,
        mode: m,
        org: '',
        baseUrl: DEFAULT_URLS[p]?.base ?? '',
        apiUrl: DEFAULT_URLS[p]?.api ?? '',
        appId: '',
        appSlug: 'sast-integration',
        privateKey: '',
        clientId: '',
        clientSecret: '',
        token: '',
      });
      setTesting(false);
      setTestResult(null);
    }
  }, [open, providerName, form]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <div>
          <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeXL }}>Configure source control</div>
          <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary, fontWeight: token.fontWeightStrong, marginTop: 4 }}>
            Save provider client configuration, continue OAuth/App installation, then sync repositories.
          </div>
        </div>
      }
      width={MODAL_WIDTH.XL}
      footer={
        <Flex gap={token.paddingMD}>
          <Button block disabled={testing} onClick={() => {
            setTesting(true); setTestResult(null);
            setTimeout(() => { setTesting(false); setTestResult('success'); message.success('Connection successful'); }, 2000);
          }}>
            <FaIcon icon="fa-flask-vial" /> {testing ? 'Testing...' : testResult === 'success' ? 'Connection OK' : 'Test connection'}
          </Button>
          <Button type="primary" block onClick={onSave}>
            Save and continue
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ provider: 'GitHub', mode: 'github-app', org: '', baseUrl: 'https://github.com', apiUrl: 'https://api.github.com', appId: '', appSlug: 'sast-integration', privateKey: '', clientId: '', clientSecret: '', token: '' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          {isConnected && (
            <div style={{ padding: token.paddingLG, background: token.colorBgLayout, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG }}>
              <div style={{ marginBottom: 4 }}><SectionLabel>Connection state</SectionLabel></div>
              <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
                Connected to <strong>{form.getFieldValue('org') || 'acme'}</strong>. Use configure only to rotate credentials or change the provider instance.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <Form.Item label="Provider" name="provider">
              <Select
                style={{ width: '100%' }}
                options={PROVIDERS.map(p => ({ value: p, label: p }))}
                onChange={(v) => {
                  const m = CONNECTION_MODES[v]?.[0]?.value ?? '';
                  form.setFieldsValue({ mode: m, baseUrl: DEFAULT_URLS[v]?.base ?? '', apiUrl: DEFAULT_URLS[v]?.api ?? '' });
                }}
              />
            </Form.Item>
            <Form.Item label="Connection mode" name="mode">
              <Select style={{ width: '100%' }} options={modes} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <Form.Item label="Organization / group slug" name="org">
              <Input placeholder="acme" />
            </Form.Item>
            <Form.Item label="Base URL" name="baseUrl">
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <Form.Item label="API base URL" name="apiUrl">
              <Input />
            </Form.Item>

            {isGithubApp && (
              <Form.Item label="GitHub App ID" name="appId">
                <Input placeholder="123456" />
              </Form.Item>
            )}

            {isOAuth && (
              <Form.Item label="Client ID" name="clientId">
                <Input placeholder="Oauth client ID" />
              </Form.Item>
            )}

            {isPat && (
              <Form.Item label="Access token" name="token">
                <Input.Password placeholder="ghp_xxxxxxxxxxxx" />
              </Form.Item>
            )}
          </div>

          {isGithubApp && (
            <Form.Item label="App slug" name="appSlug">
              <Input placeholder="sast-integration" />
            </Form.Item>
          )}

          {isOAuth && (
            <Form.Item label="Client secret" name="clientSecret">
              <Input.Password placeholder="OAuth client secret" />
            </Form.Item>
          )}

          {isGithubApp && (
            <Form.Item label="Private key" name="privateKey">
              <Input.TextArea
                rows={4}
                placeholder="Paste GitHub App private key"
                style={{ fontFamily: 'monospace', fontSize: token.fontSizeSM }}
              />
            </Form.Item>
          )}
        </Flex>
      </Form>
    </Modal>
  );
}
