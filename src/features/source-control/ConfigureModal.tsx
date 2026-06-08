'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Modal, Input, Select, Form, App, Typography, Card, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/FaIcon';
import { SectionLabel } from '@/components/shared/SectionLabel';

const PROVIDERS = ['GitHub', 'GitLab', 'Gitea'];
const CONNECTION_MODES: Record<string, { value: string; label: string }[]> = {
  GitHub: [{ value: 'github-app', label: 'GitHub App' }, { value: 'oauth-app', label: 'OAuth app' }, { value: 'pat', label: 'Personal token' }],
  GitLab: [{ value: 'oauth-app', label: 'OAuth app' }, { value: 'pat', label: 'Personal token' }],
  Gitea: [{ value: 'oauth-app', label: 'OAuth app' }, { value: 'pat', label: 'Personal token' }],
};
const DEFAULT_URLS: Record<string, { base: string; api: string }> = {
  GitHub: { base: 'https://github.com', api: 'https://api.github.com' },
  GitLab: { base: 'https://gitlab.com', api: 'https://gitlab.com/api/v4' },
  Gitea: { base: 'https://gitea.io', api: 'https://gitea.io/api/v1' },
};

interface ExistingProvider {
  name: string;
  mode: string;
  modeDetail: string;
  org: string;
}

interface ConfigureModalProps {
  open: boolean;
  providerName: string;
  isConnected: boolean;
  existingProvider?: ExistingProvider;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Modal for configuring SCM provider credentials (OAuth, GitHub App, PAT).
 *
 * @example
 * <ConfigureModal open={true} providerName="GitHub" isConnected={false} onCancel={fn} onSave={fn} />
 */
export function ConfigureModal({ open, providerName, isConnected, existingProvider, onCancel, onSave }: ConfigureModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const prevOpenRef = useRef(false);
  const provider = Form.useWatch('provider', form);
  const mode = Form.useWatch('mode', form);
  const modes = CONNECTION_MODES[provider] ?? CONNECTION_MODES.GitHub;
  const isGithubApp = mode === 'github-app';
  const isOAuth = mode === 'oauth-app';
  const isPat = mode === 'pat';

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Modal just opened — reset test state
      setTesting(false);
      setTestResult(null);

      const p = providerName || 'GitHub';
      const existing = existingProvider;

      // Pre-fill non-sensitive fields from existing connection
      const org = existing?.org ?? '';
      const baseUrl = existing ? DEFAULT_URLS[p]?.base ?? '' : '';
      const apiUrl = existing ? DEFAULT_URLS[p]?.api ?? '' : '';

      // Map modeDetail back to mode value
      const modeValue = existing?.modeDetail
        ? CONNECTION_MODES[p]?.find((m) => m.label.toLowerCase().includes(existing.modeDetail.toLowerCase()))?.value ?? CONNECTION_MODES[p]?.[0]?.value ?? ''
        : CONNECTION_MODES[p]?.[0]?.value ?? '';

      form.setFieldsValue({
        provider: p,
        mode: modeValue,
        org,
        baseUrl,
        apiUrl,
        appId: '',
        appSlug: 'sast-integration',
        privateKey: '',
        clientId: '',
        clientSecret: '',
        token: '',
      });
    }
    prevOpenRef.current = open;
  }, [open, providerName, existingProvider, form]);

  return (
    <Modal key={open ? 'open' : 'closed'} open={open} onCancel={onCancel} title={<div><Typography.Text strong style={{ fontSize: token.fontSizeXL }}>Configure source control</Typography.Text><Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>Save provider credentials, then sync repositories.</Typography.Text></div>} width={MODAL_WIDTH.XL}
      footer={<Flex gap={token.paddingMD}>
        <Button block disabled={testing} onClick={() => { setTesting(true); setTestResult(null); setTimeout(() => { setTesting(false); setTestResult('success'); message.success('Connection successful'); }, 2000); }} icon={<FaIcon icon="fa-flask-vial" />}>{testing ? 'Testing...' : testResult === 'success' ? 'Connection OK' : 'Test connection'}</Button>
        <Button type="primary" block onClick={onSave}>Save and continue</Button>
      </Flex>}
    >
      <Form form={form} layout="vertical" initialValues={{ provider: 'GitHub', mode: 'github-app' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          {isConnected && <Card size="small"><SectionLabel>Connection state</SectionLabel><Typography.Text type="secondary">Connected. Use configure to rotate credentials.</Typography.Text></Card>}
          <Flex gap={token.paddingLG}>
            <Form.Item label="Provider" name="provider" style={{ flex: 1 }}><Select options={PROVIDERS.map((p) => ({ value: p, label: p }))} onChange={(v) => form.setFieldsValue({ mode: CONNECTION_MODES[v]?.[0]?.value ?? '', baseUrl: DEFAULT_URLS[v]?.base ?? '', apiUrl: DEFAULT_URLS[v]?.api ?? '' })} /></Form.Item>
            <Form.Item label="Connection mode" name="mode" style={{ flex: 1 }}><Select options={modes} /></Form.Item>
          </Flex>
          <Flex gap={token.paddingLG}>
            <Form.Item label="Organization slug" name="org" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item label="Base URL" name="baseUrl" style={{ flex: 1 }}><Input /></Form.Item>
          </Flex>
          {isGithubApp && <Form.Item label="GitHub App ID" name="appId"><Input /></Form.Item>}
          {isGithubApp && <Form.Item label="App slug" name="appSlug"><Input /></Form.Item>}
          {isGithubApp && <Form.Item label="Private key" name="privateKey"><Input.TextArea rows={4} placeholder="Paste GitHub App private key" style={{ fontFamily: 'monospace' }} /></Form.Item>}
          {isOAuth && <Form.Item label="Client ID" name="clientId"><Input /></Form.Item>}
          {isOAuth && <Form.Item label="Client secret" name="clientSecret"><Input.Password /></Form.Item>}
          {isPat && <Form.Item label="Access token" name="token"><Input.Password placeholder="ghp_xxxxxxxxxxxx" /></Form.Item>}
        </Flex>
      </Form>
    </Modal>
  );
}
