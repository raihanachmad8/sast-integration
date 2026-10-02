'use client';

import { Button, Modal, Input, InputNumber, Select, Form, App, Typography, Drawer, Flex, Switch, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/fa-icon';
import { StatusPill } from '@/components/shared/StatusPill';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { CloseOutlined } from '@ant-design/icons';
import { SUPPORTED_SCANNERS, SCANNER_LABELS } from '@/commons/constants/scan';

/* ── Scanner options — read from SUPPORTED_SCANNERS, map to label ── */
const SCANNER_OPTIONS = SUPPORTED_SCANNERS.map((s) => ({
  value: s,
  label: SCANNER_LABELS[s],
}));

/* ── Severity options — must match Zod schema enum ── */
const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

/* ── Profile type options — must match Zod schema enum ── */
const PROFILE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'strict', label: 'Strict' },
  { value: 'custom', label: 'Custom' },
];

/* ── Default backend constants (used when form value is 0) ── */
const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_FINDINGS = 2000;

interface ScanProfile {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  aiVerification: boolean;
  severityThreshold: string;
  timeoutSeconds: number;
  maxFindings: number;
  isDefault?: boolean;
}

interface ScanProfileDetailDrawerProps {
  open: boolean;
  profile: ScanProfile | null;
  onClose: () => void;
  onEdit: (profile: ScanProfile) => void;
  onDelete: (profile: ScanProfile) => void;
}

export function ScanProfileDetailDrawer({ open, profile, onClose, onEdit, onDelete }: ScanProfileDetailDrawerProps) {
  const { token } = theme.useToken();
  if (!profile) return null;

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
            <Typography.Title level={2} style={{ margin: 0, fontSize: token.fontSizeXL, fontWeight: token.fontWeightStrong, color: token.colorText }}>{profile.name}</Typography.Title>
            <div style={{ marginTop: token.paddingSM }}>
              <StatusPill variant="blue">{PROFILE_TYPE_OPTIONS.find(o => o.value === profile.profile)?.label ?? profile.profile}</StatusPill>
            </div>
          </div>
          <Button type="text" onClick={onClose} icon={<CloseOutlined />} />
        </Flex>
      </div>

      <Flex vertical gap={token.paddingMD} style={{ padding: token.paddingXL }}>
        <section>
          <div style={{ marginBottom: token.paddingMD }}><SectionLabel as="h3">Configuration</SectionLabel></div>
          <Flex vertical gap={token.paddingMD}>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text type="secondary">Profile type</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{PROFILE_TYPE_OPTIONS.find(o => o.value === profile.profile)?.label ?? profile.profile}</Typography.Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text type="secondary">AI verification</Typography.Text>
              <StatusPill variant={profile.aiVerification ? 'teal' : 'amber'}>{profile.aiVerification ? 'Enabled' : 'Disabled'}</StatusPill>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text type="secondary">Severity gate</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{SEVERITY_OPTIONS.find(o => o.value === profile.severityThreshold)?.label ?? profile.severityThreshold}</Typography.Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text type="secondary">Timeout</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{profile.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS}s</Typography.Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Typography.Text type="secondary">Max findings</Typography.Text>
              <Typography.Text style={{ fontWeight: token.fontWeightStrong }}>{profile.maxFindings || DEFAULT_MAX_FINDINGS}</Typography.Text>
            </Flex>
          </Flex>
        </section>

        <section>
          <div style={{ marginBottom: token.paddingMD }}><SectionLabel as="h3">Scanners</SectionLabel></div>
          <Flex wrap="wrap" gap={token.paddingSM}>
            {profile.scanners.map((s) => <StatusPill key={s} variant="slate">{SCANNER_LABELS[s as keyof typeof SCANNER_LABELS] ?? s}</StatusPill>)}
          </Flex>
        </section>

        <Flex gap={token.paddingMD}>
          <Button type="primary" onClick={() => { onEdit(profile); onClose(); }} disabled={profile.isDefault}>
            <FaIcon icon="fa-pen" /> Edit profile
          </Button>
          <Button danger onClick={() => onDelete(profile)} disabled={profile.isDefault}>
            <FaIcon icon="fa-trash" /> Delete
          </Button>
        </Flex>
      </Flex>
    </Drawer>
  );
}

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
            <Form.Item label="Profile name" name="name" required rules={[{ required: true, message: 'Profile name is required' }]}>
              <Input />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Profile type" name="profile">
                <Select style={{ width: '100%' }} options={PROFILE_TYPE_OPTIONS} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Severity gate" name="severityThreshold">
                <Select style={{ width: '100%' }} options={SEVERITY_OPTIONS} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="AI verification" name="aiVerification" valuePropName="checked">
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Timeout (seconds)" name="timeoutSeconds" extra="0 = default (300s)">
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Max findings" name="maxFindings" extra="0 = default (2000)">
                <InputNumber min={0} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="Scanners" name="scanners">
              <Select mode="multiple" style={{ width: '100%' }} options={SCANNER_OPTIONS} />
            </Form.Item>
          </div>
        </Flex>
      </Form>
    </Modal>
  );
}

interface CreateScanProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => void;
}

export function CreateScanProfileModal({ open, onClose, onSave }: CreateScanProfileModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave({
        ...values,
        timeoutSeconds: values.timeoutSeconds ?? 0,
        maxFindings: values.maxFindings ?? 0,
      });
      onClose();
      form.resetFields();
      message.success('Profile created');
    }).catch(() => {});
  };

  return (
    <Modal title="New profile" open={open} onOk={handleSave} onCancel={onClose} okText="Create" width={MODAL_WIDTH.MD}>
      <Form form={form} layout="vertical" initialValues={{ name: '', profile: 'standard', scanners: ['semgrep'], aiVerification: true, severityThreshold: 'medium', timeoutSeconds: 0, maxFindings: 0 }}>
        <Flex vertical gap={token.paddingMD} style={{ padding: `${token.paddingLG} 0` }}>
          <div>
            <Form.Item label="Profile name" name="name" required rules={[{ required: true, message: 'Profile name is required' }]}>
              <Input placeholder="e.g., PR Quick Check" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Profile type" name="profile">
                <Select style={{ width: '100%' }} options={PROFILE_TYPE_OPTIONS} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Severity gate" name="severityThreshold">
                <Select style={{ width: '100%' }} options={SEVERITY_OPTIONS} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="AI verification" name="aiVerification" valuePropName="checked">
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.paddingLG }}>
            <div>
              <Form.Item label="Timeout (seconds)" name="timeoutSeconds" extra="0 = default (300s)">
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label="Max findings" name="maxFindings" extra="0 = default (2000)">
                <InputNumber min={0} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
          <div>
            <Form.Item label="Scanners" name="scanners">
              <Select mode="multiple" style={{ width: '100%' }} options={SCANNER_OPTIONS} />
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
  onSelect: (template: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => void;
}

const TEMPLATES = [
  { id: 'quick-pr', name: 'Quick PR Check', profile: 'standard', scanners: ['semgrep'], aiVerification: false, severityThreshold: 'high', timeoutSeconds: 120, maxFindings: 500, description: 'Fast scan for pull requests' },
  { id: 'standard', name: 'Standard Workspace', profile: 'standard', scanners: ['semgrep', 'gitleaks'], aiVerification: true, severityThreshold: 'medium', timeoutSeconds: 0, maxFindings: 0, description: 'Balanced security and performance' },
  { id: 'comprehensive', name: 'Comprehensive Release', profile: 'strict', scanners: ['semgrep', 'gitleaks', 'flawfinder', 'trivy'], aiVerification: true, severityThreshold: 'low', timeoutSeconds: 0, maxFindings: 0, description: 'Thorough scan for releases' },
];

export function TemplatesModal({ open, onClose, onSelect }: TemplatesModalProps) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const handleSelect = (template: typeof TEMPLATES[number]) => {
    onSelect({ name: template.name, profile: template.profile, scanners: template.scanners, aiVerification: template.aiVerification, severityThreshold: template.severityThreshold, timeoutSeconds: template.timeoutSeconds, maxFindings: template.maxFindings });
    onClose();
    message.success(`Template "${template.name}" applied`);
  };

  return (
    <Modal title="Profile templates" open={open} onCancel={onClose} footer={null} width={MODAL_WIDTH.LG} styles={{ body: { padding: token.paddingXL } }}>
      <div role="listbox" aria-label="Profile templates" style={{ display: 'grid', gap: token.paddingMD }}>
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
              overflow: 'hidden',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: token.borderRadiusLG, background: token.colorTealBg, color: token.colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: token.fontSizeXL, flexShrink: 0 }}>
              <FaIcon icon="fa-file-shield" />
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: token.fontWeightStrong, color: token.colorText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</Typography.Text>
              <Flex gap={token.marginXXS} wrap="wrap" style={{ marginTop: token.paddingSM }}>
                <StatusPill variant="blue">{PROFILE_TYPE_OPTIONS.find(o => o.value === t.profile)?.label ?? t.profile}</StatusPill>
                <StatusPill variant="slate">{t.scanners.map(s => SCANNER_LABELS[s as keyof typeof SCANNER_LABELS] ?? s).join(', ')}</StatusPill>
              </Flex>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
