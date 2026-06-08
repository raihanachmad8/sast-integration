'use client';

import { Modal, Input, InputNumber, Select, Form, App, Flex, Switch, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { SUPPORTED_SCANNERS, SCANNER_LABELS } from '@/commons/constants/scan';
import type { ScanProfile } from '@/commons/types/scans';
import { updateScanProfileSchema } from '@/commons/schemas/scan-profile.schema';
import { createZodSync } from '@/lib/utils/zod-sync';

const SCANNER_OPTIONS = SUPPORTED_SCANNERS.map((s) => ({
  value: s,
  label: SCANNER_LABELS[s],
}));

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

interface EditScanProfileModalProps {
  open: boolean;
  profile: ScanProfile | null;
  onClose: () => void;
  onSave: (values: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => void;
}

export function EditScanProfileModal({ open, profile, onClose, onSave }: EditScanProfileModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(updateScanProfileSchema);

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave({
        ...values,
        timeoutSeconds: values.timeoutSeconds ?? 0,
        maxFindings: values.maxFindings ?? 0,
      });
      onClose();
      message.success('Profile updated');
    }).catch(() => {});
  };

  return (
    <Modal title="Edit profile" open={open} key={profile?.id ?? 'create'} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{
        name: profile?.name ?? '',
        profile: profile?.profile ?? 'standard',
        scanners: profile?.scanners ?? ['semgrep'],
        aiVerification: profile?.aiVerification ?? true,
        severityThreshold: profile?.severityThreshold ?? 'medium',
        timeoutSeconds: profile?.timeoutSeconds ?? 0,
        maxFindings: profile?.maxFindings ?? 0,
      }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Profile name" name="name" required rules={[rule]}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Severity gate" name="severityThreshold" rules={[rule]}>
                <Select style={{ width: '100%' }} options={SEVERITY_OPTIONS} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="AI verification" name="aiVerification" valuePropName="checked" rules={[rule]}>
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Timeout (seconds)" name="timeoutSeconds" extra="0 = default (300s)" rules={[rule]}>
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Max findings" name="maxFindings" extra="0 = default (2000)" rules={[rule]}>
                <InputNumber min={0} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="Scanners" name="scanners" rules={[rule]}>
              <Select mode="multiple" style={{ width: '100%' }} options={SCANNER_OPTIONS} />
            </Form.Item>
          </div>
        </Flex>
      </Form>
    </Modal>
  );
}
