'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, Input, Select, Form, App, Typography, Card, Flex, Alert, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/commons/components/FaIcon';
import { SectionLabel } from '@/commons/components/SectionLabel';
import { sourceControlApi } from '@/modules/source-control/api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { createZodSync } from '@/lib/utils/zod-sync';
import { z } from 'zod';

const sourceControlSchema = z.object({
  baseUrl: z.string().url('Must be a valid URL'),
  apiUrl: z.string().url('Must be a valid URL'),
});

const validateSourceControl = createZodSync(sourceControlSchema);

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
  credentials?: Record<string, unknown>;
}

interface ConfigureModalProps {
  open: boolean;
  providerName: string;
  isConnected: boolean;
  existingProvider?: ExistingProvider;
  onCancel: () => void;
  onSave: (values: { provider: string; name: string; credentials: Record<string, unknown> }) => void;
}

/**
 * Modal for configuring SCM provider credentials (OAuth, GitHub App, PAT).
 *
 * Professional flow:
 * 1. Pre-fill provider defaults (base URL always pre-filled)
 * 2. User enters credentials
 * 3. Test connection → fetches user's orgs/repos to validate
 * 4. Save → creates provider in DB
 */
export function ConfigureModal({ open, providerName, isConnected, existingProvider, onCancel, onSave }: ConfigureModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { workspaceId } = useWorkspace();
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState('');
  const provider = Form.useWatch('provider', form);
  const mode = Form.useWatch('mode', form);
  const modes = CONNECTION_MODES[provider] ?? CONNECTION_MODES.GitHub;
  const isGithubApp = mode === 'github-app';
  const isOAuth = mode === 'oauth-app';
  const isPat = mode === 'pat';

  const initialValues = useMemo(() => {
    const p = providerName || 'GitHub';
    const existing = existingProvider;
    const creds = (existing?.credentials ?? {}) as Record<string, unknown>;

    const baseUrl = (creds.baseUrl as string) || DEFAULT_URLS[p]?.base || '';
    const apiUrl = (creds.apiUrl as string) || DEFAULT_URLS[p]?.api || '';
    const org = (creds.org as string) || existing?.org || '';

    const modeValue = existing?.modeDetail
      ? CONNECTION_MODES[p]?.find((m) => m.label.toLowerCase().includes(existing.modeDetail.toLowerCase()))?.value ?? CONNECTION_MODES[p]?.[0]?.value ?? ''
      : CONNECTION_MODES[p]?.[0]?.value ?? '';

    return {
      provider: p,
      mode: modeValue,
      org,
      baseUrl,
      apiUrl,
      appId: (creds.appId as string) || '',
      appSlug: (creds.appSlug as string) || 'sast-integration',
      privateKey: '',
      clientId: (creds.clientId as string) || '',
      clientSecret: '',
      token: '',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- provider is read via Form.useWatch and affects default URLs
  }, [providerName, existingProvider, provider]);

  const handleTestConnection = useCallback(async () => {
    if (!workspaceId) return;
    setTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      // Save first so we have a provider ID to test
      const values = form.getFieldsValue();
      const providerId = existingProvider ? (existingProvider as unknown as { id: string }).id : null;

      if (providerId) {
        // Test existing connection
        const result = await sourceControlApi.testProvider(workspaceId, providerId);
        if (result.configured) {
          setTestResult('success');
          message.success(`Connection OK — ${result.configuredKeys?.length ?? 0} credentials configured`);
        } else {
          setTestResult('error');
          setTestError('No credentials configured. Please fill in the required fields.');
        }
      } else {
        // For new connections, try to save and test
        const hasRequiredFields = isPat
          ? !!values.token
          : isGithubApp
            ? !!values.appId && !!values.privateKey
            : isOAuth
              ? !!values.clientId && !!values.clientSecret
              : true;

        if (!hasRequiredFields) {
          setTestResult('error');
          setTestError('Please fill in all required credentials before testing.');
        } else {
          // Try to create the provider first, then test it
          try {
            const newProvider = await sourceControlApi.addProvider(workspaceId, {
              provider: provider.toLowerCase(),
              name: provider,
              credentials: values,
            });
            const providerId = newProvider?.sourceControl?.id;
            if (providerId) {
              const testRes = await sourceControlApi.testProvider(workspaceId, providerId);
              if (testRes.configured) {
                setTestResult('success');
                message.success('Connection test passed');
              } else {
                setTestResult('error');
                setTestError('No credentials configured. Please fill in the required fields.');
              }
            }
          } catch {
            setTestResult('error');
            setTestError('Failed to create connection. Please check your credentials.');
          }
        }
      }
    } catch {
      setTestResult('error');
      setTestError('Connection test failed. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  }, [workspaceId, existingProvider, form, isPat, isGithubApp, isOAuth, message, provider]);

  return (
    <Modal
      key={open ? 'open' : 'closed'}
      open={open}
      destroyOnHidden
      onCancel={onCancel}
      afterClose={() => { setTesting(false); setTestResult(null); setTestError(''); }}
      title={
        <div>
          <Typography.Text strong style={{ fontSize: token.fontSizeXL }}>Configure source control</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            {isConnected ? 'Update credentials or rotate tokens.' : 'Enter credentials, test the connection, then save.'}
          </Typography.Text>
        </div>
      }
      width={MODAL_WIDTH.XL}
      footer={
        <Flex gap={token.paddingMD}>
          <Button
            block
            loading={testing}
            disabled={testing}
            onClick={handleTestConnection}
            icon={<FaIcon icon="fa-flask-vial" />}
          >
            {testing ? 'Testing...' : testResult === 'success' ? 'Connection OK' : 'Test connection'}
          </Button>
          <Button
            type="primary"
            block
            onClick={() => {
              const values = form.getFieldsValue();
              const { provider: p, mode: m, org, baseUrl, apiUrl, appId, appSlug, privateKey, clientId, clientSecret, token: pat } = values;
              onSave({
                provider: p.toLowerCase(),
                name: p,
                credentials: { mode: m, org, baseUrl, apiUrl, appId, appSlug, privateKey, clientId, clientSecret, token: pat },
              });
            }}
          >
            Save and continue
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          {isConnected && (
            <Card size="small">
              <SectionLabel>Connection state</SectionLabel>
              <Typography.Text type="secondary">Connected. Use configure to rotate credentials.</Typography.Text>
            </Card>
          )}

          {testResult === 'success' && (
            <Alert type="success" showIcon title="Connection successful" description="Provider credentials are valid." />
          )}
          {testResult === 'error' && (
            <Alert type="error" showIcon title="Connection failed" description={testError} />
          )}

          <Flex gap={token.paddingLG}>
            <Form.Item label="Provider" name="provider" style={{ flex: 1 }}>
              <Select
                options={PROVIDERS.map((p) => ({ value: p, label: p }))}
                onChange={(v) => form.setFieldsValue({
                  mode: CONNECTION_MODES[v]?.[0]?.value ?? '',
                  baseUrl: DEFAULT_URLS[v]?.base ?? '',
                  apiUrl: DEFAULT_URLS[v]?.api ?? '',
                })}
              />
            </Form.Item>
            <Form.Item label="Connection mode" name="mode" style={{ flex: 1 }}>
              <Select options={modes} />
            </Form.Item>
          </Flex>

          <Flex gap={token.paddingLG}>
            <Form.Item
              label="Organization slug"
              name="org"
              style={{ flex: 1 }}
              extra={<Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Optional. Leave empty to fetch user repos.</Typography.Text>}
            >
              <Input placeholder="e.g., my-org" />
            </Form.Item>
            <Form.Item
              label="Base URL"
              name="baseUrl"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Base URL is required' }, validateSourceControl]}
            >
              <Input />
            </Form.Item>
          </Flex>

          {isGithubApp && (
            <>
              <Form.Item label="GitHub App ID" name="appId"><Input /></Form.Item>
              <Form.Item label="App slug" name="appSlug"><Input /></Form.Item>
              <Form.Item label="Private key" name="privateKey" extra={existingProvider?.credentials?.privateKey ? 'Leave blank to keep existing key.' : undefined}>
                <Input.TextArea rows={4} placeholder={existingProvider?.credentials?.privateKey ? '(existing key — paste new key to replace)' : 'Paste GitHub App private key'} style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </>
          )}

          {isOAuth && (
            <>
              <Form.Item label="Client ID" name="clientId"><Input /></Form.Item>
              <Form.Item label="Client secret" name="clientSecret" extra={existingProvider?.credentials?.clientSecret ? 'Leave blank to keep existing secret.' : undefined}>
                <Input.Password placeholder={existingProvider?.credentials?.clientSecret ? '(existing secret — paste new value to replace)' : ''} />
              </Form.Item>
            </>
          )}

          {isPat && (
            <Form.Item label="Access token" name="token" rules={[{ required: true, message: 'Access token is required' }]} extra={existingProvider?.credentials?.token ? 'Leave blank to keep existing token.' : undefined}>
              <Input.Password placeholder={existingProvider?.credentials?.token ? '(existing token — paste new value to replace)' : (provider === 'GitHub' ? 'ghp_xxxxxxxxxxxx' : provider === 'GitLab' ? 'glpat-xxxxxxxxxxxx' : 'your-token')} />
            </Form.Item>
          )}
        </Flex>
      </Form>
    </Modal>
  );
}
