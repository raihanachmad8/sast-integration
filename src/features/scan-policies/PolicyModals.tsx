'use client';

import { useEffect } from 'react';
import { Button, Modal, Input, Select, Form, App, Typography, Drawer, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/fa-icon';
import { StatusPill } from '@/components/shared/StatusPill';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { CloseOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface Policy {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  ai: string;
  severity: string;
  isDefault: boolean;
}

interface PolicyDetailDrawerProps {
  open: boolean;
  policy: Policy | null;
  onClose: () => void;
  onEdit: (policy: Policy) => void;
}

export function PolicyDetailDrawer({ open, policy, onClose, onEdit }: PolicyDetailDrawerProps) {
  const { token } = theme.useToken();
  if (!policy) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={null}
      size="large"
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: token.paddingXL, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Title level={2} style={{ margin: 0, fontSize: token.fontSizeXL, fontWeight: token.fontWeightStrong, color: token.colorText }}>{policy.name}</Title>
            <div style={{ marginTop: token.paddingSM }}>
              <StatusPill variant="blue">{policy.profile}</StatusPill>
            </div>
          </div>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <Flex vertical gap={token.paddingXL * 2} style={{ padding: token.paddingXL }}>
        <section>
          <div style={{ marginBottom: token.paddingMD }}><SectionLabel as="h3">Configuration</SectionLabel></div>
          <Flex vertical gap={token.paddingMD}>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text style={{ color: token.colorTextSecondary }}>Profile</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{policy.profile}</Typography.Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text style={{ color: token.colorTextSecondary }}>AI verification</Typography.Text>
              <StatusPill variant={policy.ai === 'Enabled' ? 'teal' : 'amber'}>{policy.ai}</StatusPill>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text style={{ color: token.colorTextSecondary }}>Severity gate</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{policy.severity}</Typography.Text>
            </Flex>
          </Flex>
        </section>

        <section>
          <div style={{ marginBottom: token.paddingMD }}><SectionLabel as="h3">Scanners</SectionLabel></div>
          <Flex wrap="wrap" gap={token.paddingSM}>
            {policy.scanners.map((s) => <StatusPill key={s} variant="slate">{s}</StatusPill>)}
          </Flex>
        </section>

        <Flex gap={token.paddingMD}>
          <Button type="primary" onClick={() => { onEdit(policy); onClose(); }}>
            <FaIcon icon="fa-pen" /> Edit policy
          </Button>
        </Flex>
      </Flex>
    </Drawer>
  );
}

interface EditPolicyModalProps {
  open: boolean;
  policy: Policy | null;
  onClose: () => void;
  onSave: (values: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => void;
}

export function EditPolicyModal({ open, policy, onClose, onSave }: EditPolicyModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  useEffect(() => {
    if (policy) {
      form.setFieldsValue({ name: policy.name, profile: policy.profile, scanners: policy.scanners, ai: policy.ai, severity: policy.severity });
    }
  }, [policy, form]);

  const handleSave = () => {
    onSave(form.getFieldsValue());
    onClose();
    message.success('Policy updated');
  };

  return (
    <Modal title="Edit policy" open={open} onOk={handleSave} onCancel={onClose} okText="Save" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', profile: 'Standard', scanners: ['Semgrep'], ai: 'Enabled', severity: 'Medium+' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Policy name" name="name" required rules={[{ required: true, message: 'Policy name is required' }]}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Profile" name="profile">
                <Select style={{ width: '100%' }} options={[{ value: 'Quick', label: 'Quick' }, { value: 'Standard', label: 'Standard' }, { value: 'Comprehensive', label: 'Comprehensive' }]} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="AI verification" name="ai">
                <Select style={{ width: '100%' }} options={[{ value: 'Enabled', label: 'Enabled' }, { value: 'Critical only', label: 'Critical only' }, { value: 'Disabled', label: 'Disabled' }]} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="Severity gate" name="severity">
              <Select style={{ width: '100%' }} options={[{ value: 'Low+', label: 'Low+' }, { value: 'Medium+', label: 'Medium+' }, { value: 'High+', label: 'High+' }, { value: 'Critical only', label: 'Critical only' }]} />
            </Form.Item>
          </div>
          <div>
            <Form.Item label="Scanners" name="scanners">
              <Select mode="multiple" style={{ width: '100%' }} options={[{ value: 'Semgrep', label: 'Semgrep' }, { value: 'Gitleaks', label: 'Gitleaks' }, { value: 'Flawfinder', label: 'Flawfinder' }, { value: 'CodeQL', label: 'CodeQL' }]} />
            </Form.Item>
          </div>
        </Flex>
      </Form>
    </Modal>
  );
}

interface CreatePolicyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => void;
}

export function CreatePolicyModal({ open, onClose, onSave }: CreatePolicyModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => {
    onSave(form.getFieldsValue());
    onClose();
    form.resetFields();
    message.success('Policy created');
  };

  return (
    <Modal title="New policy" open={open} onOk={handleSave} onCancel={onClose} okText="Create" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', profile: 'Standard', scanners: ['Semgrep'], ai: 'Enabled', severity: 'Medium+' }}>
        <Flex vertical gap={token.paddingXL} style={{ padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Policy name" name="name" required rules={[{ required: true, message: 'Policy name is required' }]}>
              <Input placeholder="e.g., PR Quick Check" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Profile" name="profile">
                <Select style={{ width: '100%' }} options={[{ value: 'Quick', label: 'Quick' }, { value: 'Standard', label: 'Standard' }, { value: 'Comprehensive', label: 'Comprehensive' }]} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="AI verification" name="ai">
                <Select style={{ width: '100%' }} options={[{ value: 'Enabled', label: 'Enabled' }, { value: 'Critical only', label: 'Critical only' }, { value: 'Disabled', label: 'Disabled' }]} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="Severity gate" name="severity">
              <Select style={{ width: '100%' }} options={[{ value: 'Low+', label: 'Low+' }, { value: 'Medium+', label: 'Medium+' }, { value: 'High+', label: 'High+' }, { value: 'Critical only', label: 'Critical only' }]} />
            </Form.Item>
          </div>
          <div>
            <Form.Item label="Scanners" name="scanners">
              <Select mode="multiple" style={{ width: '100%' }} options={[{ value: 'Semgrep', label: 'Semgrep' }, { value: 'Gitleaks', label: 'Gitleaks' }, { value: 'Flawfinder', label: 'Flawfinder' }, { value: 'CodeQL', label: 'CodeQL' }]} />
            </Form.Item>
          </div>
        </Flex>
      </Form>
    </Modal>
  );
}

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => void;
}

const TEMPLATES = [
  { id: 'quick-pr', name: 'Quick PR Check', profile: 'Quick', scanners: ['Semgrep'], ai: 'Critical only', severity: 'High+', description: 'Fast scan for pull requests' },
  { id: 'standard', name: 'Standard Workspace', profile: 'Standard', scanners: ['Semgrep', 'Gitleaks'], ai: 'Enabled', severity: 'Medium+', description: 'Balanced security and performance' },
  { id: 'comprehensive', name: 'Comprehensive Release', profile: 'Comprehensive', scanners: ['Semgrep', 'Gitleaks', 'Flawfinder'], ai: 'Enabled', severity: 'Low+', description: 'Thorough scan for releases' },
];

export function TemplatesModal({ open, onClose, onSelect }: TemplatesModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const handleSelect = (template: typeof TEMPLATES[number]) => {
    onSelect({ name: template.name, profile: template.profile, scanners: template.scanners, ai: template.ai, severity: template.severity });
    onClose();
    message.success(`Template "${template.name}" applied`);
  };

  return (
    <Modal title="Policy templates" open={open} onCancel={onClose} footer={null} width={MODAL_WIDTH.LG}>
      <div role="listbox" aria-label="Policy templates" style={{ padding: `${token.paddingLG} 0`, display: 'grid', gap: token.paddingMD }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => handleSelect(t)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token.paddingLG,
              padding: token.paddingLG,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 120ms ease',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: token.borderRadiusLG, background: token.colorTealBg, color: token.colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeXL, flexShrink: 0 }}>
              <FaIcon icon="fa-file-shield" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: token.fontWeightStrong, color: token.colorText }}>{t.name}</div>
              <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary, marginTop: 4 }}>{t.description}</div>
              <Flex gap={token.marginXXS} style={{ marginTop: token.paddingSM }}>
                <StatusPill variant={'blue' as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{t.profile}</StatusPill>
                <StatusPill variant={'slate' as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{t.scanners.join(', ')}</StatusPill>
              </Flex>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
