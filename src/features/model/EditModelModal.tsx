'use client';

import { useState, useMemo } from 'react';
import { Modal, Input, Select, Form, App, theme, Flex, Typography, Tooltip, Spin } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/FaIcon';
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
  const [selectedProvider, setSelectedProvider] = useState<string>(model?.provider ?? 'openai-compatible');
  const [fetchingModels, setFetchingModels] = useState(false);
  const rule = createZodSync(updateAiModelSchema);

  const providerConfig = useMemo(() => PROVIDERS.find(p => p.value === selectedProvider), [selectedProvider]);

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    const config = PROVIDERS.find(p => p.value === value);
    if (config) {
      form.setFieldsValue({ baseUrl: config.defaultBaseUrl });
    }
  };

  const handleFetchModels = () => {
    setFetchingModels(true);
    setTimeout(() => {
      setFetchingModels(false);
      message.success('Models fetched successfully');
    }, 1500);
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      message.success('Model updated');
    });
  };

  return (
    <Modal
      title="Edit model"
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText="Save"
      width={MODAL_WIDTH.MD}
    >
      <Form form={form} layout="vertical" initialValues={model ? { name: model.name, provider: model.provider, baseUrl: model.baseUrl, role: model.role } : { name: '', provider: 'openai-compatible', baseUrl: '', role: 'fallback' }}>
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
                <Tooltip title="Fetch available models from this endpoint">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleFetchModels}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFetchModels(); }}
                    style={{ cursor: 'pointer', color: token.colorTextSecondary }}
                  >
                    <FaIcon icon="fa-arrows-rotate" />
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
            extra={fetchingModels ? <Flex align="center" gap={token.marginXS}><Spin size="small" /><Typography.Text type="secondary">Fetching models...</Typography.Text></Flex> : undefined}
          >
            <Select
              showSearch
              placeholder="Search or type a model name"
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={providerConfig?.defaultModels.map(m => ({ value: m, label: m })) ?? []}
              notFoundContent={
                <Flex align="center" gap={token.marginSM} style={{ padding: token.paddingXS }}>
                  <FaIcon icon="fa-keyboard" style={{ color: token.colorTextSecondary }} />
                  <Typography.Text type="secondary">Type a custom model name</Typography.Text>
                </Flex>
              }
              mode={undefined}
              searchValue=""
              onSearch={() => {}}
              dropdownRender={(menu) => menu}
            />
          </Form.Item>

          {/* Role */}
          <Form.Item label="Role" name="role" rules={[rule]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          {/* Profile type */}
          <Form.Item label="Profile type" name="profileType" initialValue="standard" rules={[rule]}>
            <Select options={PROFILE_TYPE_OPTIONS} />
          </Form.Item>

        </Flex>
      </Form>
    </Modal>
  );
}
