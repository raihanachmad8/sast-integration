'use client';

import { Button, Modal, Input, Select, Checkbox, Form, App, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';

export { ConfigureModal as ConfigureProviderModal } from './ConfigureModal';

interface ImportRepoModalProps {
  open: boolean;
  repoFullName: string;
  onClose: () => void;
  onSave: (values: { project: string; autoScan: boolean }) => void;
}

export function ImportRepoModal({ open, repoFullName, onClose, onSave }: ImportRepoModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave(values);
      onClose();
      form.resetFields();
      message.success(`${repoFullName} imported successfully`);
    });
  };

  return (
    <Modal title={`Import ${repoFullName}`} open={open} onOk={handleSave} onCancel={onClose} okText="Import" width={MODAL_WIDTH.SM}>
      <div style={{ display: 'grid', gap: token.paddingXL, padding: `${token.paddingLG} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ project: '', autoScan: true }}>
          <Form.Item label="Assign to project" name="project" required rules={[{ required: true, message: 'Project is required' }]}>
            <Select style={{ width: '100%' }} placeholder="Select a project" options={[{ value: 'Commerce Platform', label: 'Commerce Platform' }, { value: 'Mobile Delivery', label: 'Mobile Delivery' }, { value: 'Internal Tools', label: 'Internal Tools' }]} />
          </Form.Item>
          <Form.Item name="autoScan" valuePropName="checked">
            <Checkbox>
              <span style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSize }}>Run initial scan after import</span>
            </Checkbox>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

interface SendTestEventModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (eventType: string) => void;
}

export function SendTestEventModal({ open, onClose, onSend }: SendTestEventModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSend = () => {
    form.validateFields().then((values) => {
      onSend(values.eventType);
      onClose();
    });
  };

  return (
    <Modal title="Send test event" open={open} onOk={handleSend} onCancel={onClose} okText="Send" width={MODAL_WIDTH.SM}>
      <div style={{ padding: `${token.paddingLG} 0` }}>
        <Form form={form} layout="vertical" initialValues={{ eventType: 'push' }}>
          <Form.Item label="Event type" name="eventType">
            <Select style={{ width: '100%' }} options={[{ value: 'push', label: 'Push event' }, { value: 'pull_request', label: 'Pull request event' }]} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

interface SyncResult {
  provider: string;
  repos: number;
  imported: number;
  newWebhooks: number;
}

interface SyncResultsModalProps {
  open: boolean;
  results: SyncResult | null;
  onClose: () => void;
}

export function SyncResultsModal({ open, results, onClose }: SyncResultsModalProps) {
  const { token } = theme.useToken();
  return (
    <Modal title="Sync complete" open={open} onCancel={onClose} footer={[<Button key="close" onClick={onClose}>Close</Button>]} width={MODAL_WIDTH.SM}>
      <div style={{ padding: `${token.paddingLG} 0`, display: 'grid', gap: token.marginMD }}>
        {results ? (
          <div style={{ padding: token.paddingLG, background: token.colorTealBg, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorTealAccent}` }}>
            <div style={{ fontWeight: token.fontWeightStrong, color: token.colorTealAccent, marginBottom: token.paddingXS }}>{results.provider} synced</div>
            <div style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
              {results.repos} repositories discovered, {results.imported} imported, {results.newWebhooks} webhooks provisioned.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: token.paddingXL, color: token.colorTextSecondary }}>
            <div style={{ fontSize: token.fontSize }}>No sync results available.</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
