'use client';

import { useEffect } from 'react';
import { Modal, Form, Input, Flex, theme } from 'antd';
import { createWebhookSchema } from '@/commons/schemas/webhook.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

interface WebhookFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: { name: string; url: string };
  onSubmit: (values: { name: string; url: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WebhookFormModal({ open, mode, initialValues, onSubmit, onCancel, loading }: WebhookFormModalProps) {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const rule = createZodSync(createWebhookSchema);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(initialValues ?? { name: '', url: '' });
    }
  }, [open, initialValues, form]);

  return (
    <Modal
      title={mode === 'create' ? 'New webhook' : 'Edit webhook'}
      open={open}
      onOk={() => form.validateFields().then((v) => { onSubmit(v); form.resetFields(); })}
      onCancel={() => { form.resetFields(); onCancel(); }}
      okText={mode === 'create' ? 'Create' : 'Save'}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingSM} 0` }}>
          <Form.Item label="Name" name="name" rules={[rule]}>
            <Input placeholder="e.g. Slack notifications" />
          </Form.Item>
          <Form.Item label="URL" name="url" rules={[rule]}>
            <Input placeholder="https://hooks.slack.com/..." />
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
