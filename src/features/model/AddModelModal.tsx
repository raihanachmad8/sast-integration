'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Modal, Input, Select, Form, App, theme, Flex, Typography, Tooltip, AutoComplete } from 'antd';
import { useState, useMemo, useCallback } from 'react';

import { FaIcon } from '@/commons/components/FaIcon';
import { MODAL_WIDTH, MODEL_ROLE } from '@/commons/constants/layout';
import { createAiModelSchema } from '@/commons/schemas/ai-model.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { aiModelsApi } from '@/modules/ai-models/api';

import { PROVIDERS, ROLE_OPTIONS, PROFILE_TYPE_OPTIONS, PROVIDER } from './providers';

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Modal form for adding a new AI model configuration — provider, name, API key, role, and profile.
 *
 * Supports fetching available models from the provider endpoint and validates via Zod schema.
 *
 * @param props - {@link AddModelModalProps}
 * @returns JSX element rendering the add model modal.
 *
 * @example
 * <AddModelModal
 *   open={true}
 *   onClose={() => setOpen(false)}
 *   onSave={(values) => createModel(values)}
 * />
 */
export function AddModelModal({ open, onClose, onSave }: AddModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<string>('openai-compatible');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const rule = createZodSync(createAiModelSchema);

  const providerConfig = useMemo(() => PROVIDERS.find(p => p.value === selectedProvider), [selectedProvider]);

  const modelOptions = useMemo(() => {
    const base = providerConfig?.defaultModels ?? [];
    const merged = [...new Set([...base, ...fetchedModels])];
    return merged.map(m => ({ value: m, label: m }));
  }, [providerConfig, fetchedModels]);

  const handleFetchModels = useCallback(async (url?: string) => {
    const baseUrl = url ?? form.getFieldValue('baseUrl');
    if (!baseUrl) {
      message.warning('Enter a Base URL first');
      return;
    }
    setFetchingModels(true);
    try {
      const models = await aiModelsApi.fetchProviderModels(baseUrl);
      if (models.length === 0) {
        message.info('No models found — type a custom name below');
      } else {
        setFetchedModels(models);
        message.success(`Fetched ${models.length} model(s)`);
      }
    } catch {
      message.error('Failed to fetch models — type a custom name below');
    } finally {
      setFetchingModels(false);
    }
  }, [form, message]);

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    setFetchedModels([]);
    const config = PROVIDERS.find(p => p.value === value);
    if (config) {
      form.setFieldsValue({ baseUrl: config.defaultBaseUrl });
      if (config.defaultBaseUrl) handleFetchModels(config.defaultBaseUrl);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // Ensure baseUrl is populated from provider default if empty
      if (!values.baseUrl) {
        const config = PROVIDERS.find(p => p.value === values.provider);
        if (config?.defaultBaseUrl) values.baseUrl = config.defaultBaseUrl;
      }
      // Ensure baseUrl has a protocol prefix
      if (values.baseUrl && !/^https?:\/\//i.test(values.baseUrl)) {
        values.baseUrl = `http://${values.baseUrl}`;
      }
      setSaving(true);
      const success = await onSave(values);
      if (success) {
        form.resetFields();
        setSelectedProvider('openai-compatible');
        setFetchedModels([]);
        onClose();
      }
    } catch {
      // validation error — antd shows inline errors
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add model"
      open={open}
      destroyOnHidden
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Add"
      confirmLoading={saving}
      width={MODAL_WIDTH.MD}
      afterOpenChange={(visible) => { if (visible && selectedProvider === PROVIDER.OPENAI_COMPATIBLE) { const url = form.getFieldValue('baseUrl'); if (url) handleFetchModels(url); } }}
    >
      <Form form={form} layout="vertical" initialValues={{ name: '', provider: 'openai-compatible', baseUrl: '', role: MODEL_ROLE.FALLBACK }} onFinish={handleSave}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingSM} 0` }}>

          {/* Provider */}
          <Form.Item
            label="Provider"
            name="provider"
            required
            rules={[rule]}
          >
            <Select
              placeholder="Select provider"
              onChange={handleProviderChange}
              optionRender={(option) => (
                <Flex align="center" gap={token.marginSM}>
                  <FaIcon icon={option.data.icon as string} style={{ width: token.size, color: token.colorTextSecondary }} />
                  <Typography.Text>{option.label}</Typography.Text>
                </Flex>
              )}
              options={PROVIDERS.map(p => ({ value: p.value, label: p.label, icon: p.icon }))}
            />
          </Form.Item>

          {/* Base URL */}
          <Form.Item
            label="Base URL"
            name="baseUrl"
            required
            rules={[rule]}
          >
            <Input
              placeholder={providerConfig?.defaultBaseUrl || 'https://api.example.com/v1'}
              onPressEnter={(e) => {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value;
                if (val) handleFetchModels(val);
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && val.startsWith('http')) handleFetchModels(val);
              }}
              suffix={
                <Tooltip
                  title="Fetch available models from this endpoint"
                  styles={{ container: { background: token.colorBgElevated, color: token.colorText, boxShadow: token.boxShadowSecondary } }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFetchModels()}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFetchModels(); }}
                    style={{ cursor: 'pointer', color: token.colorTextSecondary }}
                  >
                    {fetchingModels ? <LoadingOutlined /> : <FaIcon icon="fa-arrows-rotate" />}
                  </span>
                </Tooltip>
              }
            />
          </Form.Item>

          {/* API Key */}
          <Form.Item
            label="API Key"
            name="apiKey"
            rules={[rule]}
            extra={selectedProvider === PROVIDER.OLLAMA ? 'Ollama does not require an API key' : undefined}
          >
            <Input.Password
              placeholder={selectedProvider === PROVIDER.OLLAMA ? 'Not required for local Ollama' : 'Enter your API key'}
              disabled={selectedProvider === PROVIDER.OLLAMA}
            />
          </Form.Item>

          {/* Model Name - searchable dropdown */}
          <Form.Item
            label="Model"
            name="name"
            required
            rules={[rule]}
            extra={fetchingModels ? <Flex align="center" gap={token.marginXS}><LoadingOutlined /><Typography.Text type="secondary">Fetching models from endpoint...</Typography.Text></Flex> : undefined}
          >
            <AutoComplete
              placeholder="Search or type a model name"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={modelOptions}
            />
          </Form.Item>

          {/* Role */}
          <Form.Item label="Role" name="role" rules={[rule]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          {/* Profile type */}
          <Form.Item label="Profile type" name="promptPreset" initialValue="strict" rules={[rule]}>
            <Select options={PROFILE_TYPE_OPTIONS} />
          </Form.Item>

          {/* Hidden submit button enables Enter-to-submit in the form */}
          <button type="submit" style={{ display: 'none' }} aria-hidden="true" />

        </Flex>
      </Form>
    </Modal>
  );
}
