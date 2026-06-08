'use client';

import { Modal, Typography, App, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';
import { SCANNER_LABELS } from '@/commons/constants/scan';

const PROFILE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'strict', label: 'Strict' },
  { value: 'custom', label: 'Custom' },
];

const TEMPLATES = [
  { id: 'quick-pr', name: 'Quick PR Check', profile: 'standard', scanners: ['semgrep'], aiVerification: false, severityThreshold: 'high', timeoutSeconds: 120, maxFindings: 500, description: 'Fast scan for pull requests' },
  { id: 'standard', name: 'Standard Workspace', profile: 'standard', scanners: ['semgrep', 'gitleaks'], aiVerification: true, severityThreshold: 'medium', timeoutSeconds: 0, maxFindings: 0, description: 'Balanced security and performance' },
  { id: 'comprehensive', name: 'Comprehensive Release', profile: 'strict', scanners: ['semgrep', 'gitleaks', 'flawfinder', 'trivy'], aiVerification: true, severityThreshold: 'low', timeoutSeconds: 0, maxFindings: 0, description: 'Thorough scan for releases' },
];

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => void;
}

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
