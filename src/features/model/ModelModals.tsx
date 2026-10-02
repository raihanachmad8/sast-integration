'use client';

import { useEffect } from 'react';
import { Modal, Input, Select, Form, App, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/fa-icon';

interface Model {
  id: string;
  name: string;
  provider: string;
  role: string;
  status?: string | null;
  last_tested_at?: string | null;
  priority?: number;
}

interface EditModelModalProps {
  open: boolean;
  model: Model | null;
  onClose: () => void;
  onSave: (values: { name: string; provider: string; role: string; apiKey: string; endpoint: string }) => void;
}

export function EditModelModal({ open, model, onClose, onSave }: EditModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  useEffect(() => {
    if (model) {
      form.setFieldsValue({ name: model.name, provider: model.provider, role: model.role, apiKey: '', endpoint: '' });
    }
  }, [model, form]);

  const handleSave = () => {
    onSave(form.getFieldsValue());
    onClose();
    message.success('Model updated');
  };

  return (
    <Modal title="Edit model" open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', provider: 'Custom OpenAI-compatible', role: 'Primary', apiKey: '', endpoint: '' }}>
        <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Model name" name="name" required rules={[{ required: true, message: 'Model name is required' }]}>
              <Input placeholder="e.g., sast-qlora-8b" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Provider" name="provider">
                <Select style={{ width: '100%' }} options={[{ value: 'Custom OpenAI-compatible', label: 'Custom OpenAI-compatible' }, { value: 'Ollama', label: 'Ollama' }, { value: 'Groq', label: 'Groq' }, { value: 'OpenAI', label: 'OpenAI' }]} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Role" name="role">
                <Select style={{ width: '100%' }} options={[{ value: 'Primary', label: 'Primary' }, { value: 'Fallback 1', label: 'Fallback 1' }, { value: 'Fallback 2', label: 'Fallback 2' }]} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="API Key" name="apiKey">
              <Input.Password placeholder="Enter API key" />
            </Form.Item>
          </div>
          <div>
            <Form.Item label="Endpoint URL" name="endpoint">
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
}

interface AddModelModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { name: string; provider: string; role: string; apiKey: string; endpoint: string }) => void;
}

export function AddModelModal({ open, onClose, onSave }: AddModelModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => {
    onSave(form.getFieldsValue());
    onClose();
    form.resetFields();
    message.success('Model added');
  };

  return (
    <Modal title="Add model" open={open} onOk={handleSave} onCancel={onClose} okText="Add" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', provider: 'Custom OpenAI-compatible', role: 'Fallback 1', apiKey: '', endpoint: '' }}>
        <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Model name" name="name" required rules={[{ required: true, message: 'Model name is required' }]}>
              <Input placeholder="e.g., llama3.2:3b-q4_K_M" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Provider" name="provider">
                <Select style={{ width: '100%' }} options={[{ value: 'Custom OpenAI-compatible', label: 'Custom OpenAI-compatible' }, { value: 'Ollama', label: 'Ollama' }, { value: 'Groq', label: 'Groq' }, { value: 'OpenAI', label: 'OpenAI' }]} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Role" name="role">
                <Select style={{ width: '100%' }} options={[{ value: 'Primary', label: 'Primary' }, { value: 'Fallback 1', label: 'Fallback 1' }, { value: 'Fallback 2', label: 'Fallback 2' }]} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="API Key" name="apiKey">
              <Input.Password placeholder="Enter API key" />
            </Form.Item>
          </div>
          <div>
            <Form.Item label="Endpoint URL" name="endpoint">
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
