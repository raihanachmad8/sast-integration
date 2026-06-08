'use client';

import { useEffect } from 'react';
import { Modal, Input, Select, Form, App, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { createZodSync } from '@/lib/utils/zod-sync';
import { createAiModelSchema } from '@/commons/schemas';
import type { AiModelRow } from '@/commons/types/ai-models';

const rule = createZodSync(createAiModelSchema);

interface EditModelModalProps {
  open: boolean;
  model: AiModelRow | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}

/**
 * Modal for editing an existing AI model.
 *
 * @example
 * <EditModelModal open={true} model={m} onClose={fn} onSave={fn} />
 */
export function EditModelModal({ open, model, onClose, onSave }: EditModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  useEffect(() => {
    if (model) form.setFieldsValue({ name: model.name, provider: model.provider, role: model.role, apiKey: '', baseUrl: '' });
  }, [model, form]);

  const handleSave = () => { onSave(form.getFieldsValue()); onClose(); message.success('Model updated'); };

  return (
    <Modal title="Edit model" open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', provider: 'modal', role: 'fallback', apiKey: '', baseUrl: '' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          <Form.Item label="Model name" name="name" rules={[rule]}><Input placeholder="e.g., sast-qlora-8b" /></Form.Item>
          <Flex gap={token.paddingLG}>
            <Form.Item label="Provider" name="provider" style={{ flex: 1 }}><Select options={[{ value: 'modal', label: 'Modal' }, { value: 'ollama', label: 'Ollama' }, { value: 'openai', label: 'OpenAI' }]} /></Form.Item>
            <Form.Item label="Role" name="role" style={{ flex: 1 }}><Select options={[{ value: 'primary', label: 'Primary' }, { value: 'fallback', label: 'Fallback' }]} /></Form.Item>
          </Flex>
          <Form.Item label="API Key" name="apiKey"><Input.Password placeholder="Enter API key" /></Form.Item>
          <Form.Item label="Base URL" name="baseUrl"><Input placeholder="https://api.example.com/v1" /></Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}

/**
 * Modal for adding a new AI model.
 *
 * @example
 * <AddModelModal open={true} onClose={fn} onSave={fn} />
 */
export function AddModelModal({ open, onClose, onSave }: AddModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => { onSave(form.getFieldsValue()); onClose(); form.resetFields(); message.success('Model added'); };

  return (
    <Modal title="Add model" open={open} onOk={handleSave} onCancel={onClose} okText="Add" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', provider: 'modal', role: 'fallback', apiKey: '', baseUrl: '' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          <Form.Item label="Model name" name="name" rules={[rule]}><Input placeholder="e.g., llama3.2:3b-q4_K_M" /></Form.Item>
          <Flex gap={token.paddingLG}>
            <Form.Item label="Provider" name="provider" style={{ flex: 1 }}><Select options={[{ value: 'modal', label: 'Modal' }, { value: 'ollama', label: 'Ollama' }, { value: 'openai', label: 'OpenAI' }]} /></Form.Item>
            <Form.Item label="Role" name="role" style={{ flex: 1 }}><Select options={[{ value: 'primary', label: 'Primary' }, { value: 'fallback', label: 'Fallback' }]} /></Form.Item>
          </Flex>
          <Form.Item label="API Key" name="apiKey"><Input.Password placeholder="Enter API key" /></Form.Item>
          <Form.Item label="Base URL" name="baseUrl"><Input placeholder="https://api.example.com/v1" /></Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
