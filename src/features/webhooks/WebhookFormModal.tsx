'use client';

import { Modal, Form, Input, Select, Flex, theme } from 'antd';
import { createWebhookSchema } from '@/commons/schemas/webhook.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

const EVENT_OPTIONS = [
  { value: 'scan.completed', label: 'Scan completed' },
  { value: 'scan.failed', label: 'Scan failed' },
  { value: 'finding.created', label: 'Finding created' },
  { value: 'finding.updated', label: 'Finding updated' },
  { value: 'report.generated', label: 'Report generated' },
  { value: 'gate.passed', label: 'Quality gate passed' },
  { value: 'gate.failed', label: 'Quality gate failed' },
];

interface WebhookFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: { name: string; url: string; events?: string[] };
  onSubmit: (values: { name: string; url: string; events: string[] }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function WebhookFormModal({ open, mode, initialValues, onSubmit, onCancel, loading }: WebhookFormModalProps) {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const rule = createZodSync(createWebhookSchema);

  return (
    <Modal
      title={mode === 'create' ? 'New webhook' : 'Edit webhook'}
      open={open}
      destroyOnHidden
      onOk={() => form.validateFields().then((v) => { onSubmit(v); form.resetFields(); })}
      onCancel={() => { form.resetFields(); onCancel(); }}
      okText={mode === 'create' ? 'Create' : 'Save'}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" initialValues={initialValues ?? { name: '', url: '', events: [] }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingSM} 0` }}>
          <Form.Item label="Name" name="name" rules={[rule]}>
            <Input placeholder="e.g. Slack notifications" />
          </Form.Item>
          <Form.Item label="URL" name="url" rules={[rule]}>
            <Input placeholder="https://hooks.slack.com/..." />
          </Form.Item>
          <Form.Item label="Events" name="events" rules={[rule]}>
            <Select mode="multiple" placeholder="Select events to listen for" options={EVENT_OPTIONS} />
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
