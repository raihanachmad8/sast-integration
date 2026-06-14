'use client';

import { Button, Modal, Select, Form, App, Typography, Card, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { ConfigureModal as ConfigureProviderModal } from './ConfigureModal';

interface ImportRepoModalProps { open: boolean; repoFullName: string; onClose: () => void; onSave: () => void; }

export function ImportRepoModal({ open, repoFullName, onClose, onSave }: ImportRepoModalProps) {
  const { message } = App.useApp();

  return (
    <Modal
      title={`Import ${repoFullName}`}
      open={open}
      onOk={() => { onSave(); onClose(); message.success(`${repoFullName} imported`); }}
      onCancel={onClose}
      okText="Import"
      width={MODAL_WIDTH.SM}
    >
      <Flex vertical gap={13}>
        <Typography.Text>
          Import <Typography.Text strong>{repoFullName}</Typography.Text> to your workspace.
          You can assign it to a project after import from the Repositories page.
        </Typography.Text>
      </Flex>
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
