'use client';

import { Button, Modal, Select, Checkbox, Form, App, Typography, Card, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { importRepoSchema } from '@/commons/schemas/source-control-import.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { ConfigureModal as ConfigureProviderModal } from './ConfigureModal';

interface ImportRepoModalProps { open: boolean; repoFullName: string; onClose: () => void; onSave: (values: { project: string; autoScan: boolean }) => void; }

/**
 * Modal for importing a repository from SCM into a project.
 *
 * @example
 * <ImportRepoModal open={true} repoFullName="org/repo" onClose={fn} onSave={fn} />
 */
export function ImportRepoModal({ open, repoFullName, onClose, onSave }: ImportRepoModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const rule = createZodSync(importRepoSchema);

  const { token } = theme.useToken();

  return (
    <Modal title={`Import ${repoFullName}`} open={open} onOk={() => form.validateFields().then((v) => { onSave(v); onClose(); form.resetFields(); message.success(`${repoFullName} imported`); })} onCancel={onClose} okText="Import" width={MODAL_WIDTH.SM}>
      <Form form={form} layout="vertical" initialValues={{ project: '', autoScan: true }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingSM} 0` }}>
          <Form.Item label="Assign to project" name="project" rules={[rule]}><Select style={{ width: '100%' }} placeholder="Select a project" options={[{ value: 'Commerce Platform', label: 'Commerce Platform' }, { value: 'Mobile Delivery', label: 'Mobile Delivery' }]} /></Form.Item>
          <Form.Item label="Run initial scan after import" name="autoScan" valuePropName="checked" rules={[rule]}><Checkbox><Typography.Text strong>Run initial scan after import</Typography.Text></Checkbox></Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}

interface SendTestEventModalProps { open: boolean; onClose: () => void; onSend: (eventType: string) => void; }

/**
 * Modal for sending a test webhook event.
 *
 * @example
 * <SendTestEventModal open={true} onClose={fn} onSend={fn} />
 */
export function SendTestEventModal({ open, onClose, onSend }: SendTestEventModalProps) {
  const [form] = Form.useForm();

  const { token } = theme.useToken();

  return (
    <Modal title="Send test event" open={open} onOk={() => form.validateFields().then((v) => { onSend(v.eventType); onClose(); })} onCancel={onClose} okText="Send" width={MODAL_WIDTH.SM}>
      <Form form={form} layout="vertical" initialValues={{ eventType: 'push' }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingSM} 0` }}>
          <Form.Item label="Event type" name="eventType"><Select style={{ width: '100%' }} options={[{ value: 'push', label: 'Push event' }, { value: 'pull_request', label: 'Pull request event' }]} /></Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}

interface SyncResultsModalProps { open: boolean; results: { provider: string; repos: number; imported: number; newWebhooks: number } | null; onClose: () => void; }

/**
 * Modal showing sync results after syncing SCM providers.
 *
 * @example
 * <SyncResultsModal open={true} results={r} onClose={fn} />
 */
export function SyncResultsModal({ open, results, onClose }: SyncResultsModalProps) {
  const { token } = theme.useToken();
  return (
    <Modal title="Sync complete" open={open} onCancel={onClose} footer={[<Button key="close" onClick={onClose}>Close</Button>]} width={MODAL_WIDTH.SM}>
      {results ? (
        <Card size="small" style={{ background: token.colorTealBg, border: `1px solid ${token.colorTealAccent}` }}>
          <Typography.Text strong style={{ color: token.colorTealAccent }}>{results.provider} synced</Typography.Text>
          <Typography.Text style={{ display: 'block', marginTop: 4 }}>{results.repos} repos, {results.imported} imported, {results.newWebhooks} webhooks.</Typography.Text>
        </Card>
      ) : <Flex align="center" justify="center" style={{ padding: token.paddingXL }}><Typography.Text type="secondary">No sync results.</Typography.Text></Flex>}
    </Modal>
  );
}

export { ConfigureProviderModal };
