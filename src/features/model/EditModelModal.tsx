'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Modal, Input, Select, Form, App, theme, Flex, Typography, Tooltip } from 'antd';
import { useState, useMemo } from 'react';

import { FaIcon } from '@/commons/components/FaIcon';
import { MODAL_WIDTH, MODEL_ROLE } from '@/commons/constants/layout';
import { updateAiModelSchema } from '@/commons/schemas/ai-model.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { aiModelsApi } from '@/modules/ai-models/api';

import { PROVIDERS, ROLE_OPTIONS, PROFILE_TYPE_OPTIONS, PROVIDER } from './providers';

interface Model {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  role: typeof MODEL_ROLE.PRIMARY | typeof MODEL_ROLE.FALLBACK;
  priority?: number;
  promptPreset?: string;
  status?: string | null;
  lastTestedAt?: string | null;
}

interface EditModelModalProps {
  open: boolean;
  model: Model | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Modal form for editing an existing AI model configuration — provider, name, API key, role, and profile.
 *
 * Supports fetching available models from the provider endpoint and validates via Zod schema.
 *
 * @param props - {@link EditModelModalProps}
 * @returns JSX element rendering the edit model modal.
 *
 * @example
 * <EditModelModal
 *   open={true}
 *   model={existingModel}
 *   onClose={() => setOpen(false)}
 *   onSave={(values) => updateModel(values)}
 * />
 */
export function EditModelModal({ open, model, onClose, onSave }: EditModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const selectedProvider = Form.useWatch('provider', form) ?? model?.provider ?? 'openai-compatible';
  const [fetchingModels, setFetchingModels] = useState(false);
  const [saving, setSaving] = useState(false);
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
      if (config.defaultBaseUrl) handleFetchModels();
    }
  };

  const handleFetchModels = async () => {
    const baseUrl = form.getFieldValue('baseUrl');
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
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // Ensure baseUrl has a protocol prefix
      if (values.baseUrl && !/^https?:\/\//i.test(values.baseUrl)) {
        values.baseUrl = `http://${values.baseUrl}`;
      }
      setSaving(true);
      const success = await onSave(values);
      if (success) {
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
      title="Edit model"
      open={open}
      destroyOnHidden
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Save"
      confirmLoading={saving}
      width={MODAL_WIDTH.MD}
    >
      <Form form={form} layout="vertical" initialValues={{ name: model?.name ?? '', provider: model?.provider ?? 'openai-compatible', baseUrl: model?.baseUrl ?? '', role: model?.role ?? 'fallback', promptPreset: model?.promptPreset ?? 'strict' }} onFinish={handleSave}>
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
              onPressEnter={(e) => { e.preventDefault(); handleFetchModels(); }}
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

          {/* Hidden submit button enables Enter-to-submit in the form */}
          <button type="submit" style={{ display: 'none' }} aria-hidden="true" />

        </Flex>
      </Form>
    </Modal>
  );
}
