'use client';

import { useState, useMemo, useCallback } from 'react';
import { Modal, Input, Select, Form, App, theme, Flex, Typography, Tooltip } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/commons/components/FaIcon';
import { PROVIDERS, ROLE_OPTIONS, PROFILE_TYPE_OPTIONS } from './providers';
import { updateAiModelSchema } from '@/commons/schemas/ai-model.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

interface Model {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  role: 'primary' | 'fallback';
  priority?: number;
  promptPreset?: string;
  status?: string | null;
  lastTestedAt?: string | null;
}

interface EditModelModalProps {
  open: boolean;
  model: Model | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}

export function EditModelModal({ open, model, onClose, onSave }: EditModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const selectedProvider = Form.useWatch('provider', form) ?? model?.provider ?? 'openai-compatible';
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const rule = createZodSync(updateAiModelSchema);

  const providerConfig = useMemo(() => PROVIDERS.find(p => p.value === selectedProvider), [selectedProvider]);

  const modelOptions = useMemo(() => {
    const base = providerConfig?.defaultModels ?? [];
    const merged = [...new Set([...base, ...fetchedModels])];
    return merged.map(m => ({ value: m, label: m }));
  }, [providerConfig, fetchedModels]);

  const handleProviderChange = (value: string) => {
    setFetchedModels([]);
    const config = PROVIDERS.find(p => p.value === value);
    if (config) {
      form.setFieldsValue({ baseUrl: config.defaultBaseUrl });
    }
  };

  const handleFetchModels = useCallback(async () => {
    let baseUrl = form.getFieldValue('baseUrl');
    if (!baseUrl) {
      message.warning('Enter a Base URL first');
      return;
    }
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `http://${baseUrl}`;
    }
    const modelsUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
    setFetchingModels(true);
    try {
      const res = await fetch(modelsUrl, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const models: string[] = (json.data ?? json.models ?? []).map((m: { id?: string; name?: string }) => m.id ?? m.name).filter(Boolean);
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

  const handleSave = () => {
    form.validateFields().then((values) => {
      // Ensure baseUrl has a protocol prefix
      if (values.baseUrl && !/^https?:\/\//i.test(values.baseUrl)) {
        values.baseUrl = `http://${values.baseUrl}`;
      }
      onSave(values);
      onClose();
    });
  };

  return (
    <Modal
      title="Edit model"
      open={open}
      destroyOnHidden
      onOk={handleSave}
      onCancel={onClose}
      okText="Save"
      width={MODAL_WIDTH.MD}
    >
      <Form form={form} layout="vertical" initialValues={{ name: model?.name ?? '', provider: model?.provider ?? 'openai-compatible', baseUrl: model?.baseUrl ?? '', role: model?.role ?? 'fallback', promptPreset: model?.promptPreset ?? 'strict' }}>
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
                  <FaIcon icon={option.data.icon as string} style={{ width: 16, color: token.colorTextSecondary }} />
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
              suffix={
                <Tooltip
                  title="Fetch available models from this endpoint"
                  styles={{ container: { background: token.colorBgElevated, color: token.colorText, boxShadow: token.boxShadowSecondary } }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleFetchModels}
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
            extra={selectedProvider === 'ollama' ? 'Ollama does not require an API key' : undefined}
          >
            <Input.Password
              placeholder={selectedProvider === 'ollama' ? 'Not required for local Ollama' : 'Enter your API key'}
              disabled={selectedProvider === 'ollama'}
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
            <Select
              showSearch
              placeholder="Search or type a model name"
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={modelOptions}
              notFoundContent={
                <Flex align="center" gap={token.marginSM} style={{ padding: token.paddingXS }}>
                  <FaIcon icon="fa-keyboard" style={{ color: token.colorTextSecondary }} />
                  <Typography.Text type="secondary">Type a custom model name</Typography.Text>
                </Flex>
              }
            />
          </Form.Item>

          {/* Role */}
          <Form.Item label="Role" name="role" rules={[rule]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          {/* Profile type */}
          <Form.Item label="Profile type" name="promptPreset" rules={[rule]}>
            <Select options={PROFILE_TYPE_OPTIONS} />
          </Form.Item>

        </Flex>
      </Form>
    </Modal>
  );
}
