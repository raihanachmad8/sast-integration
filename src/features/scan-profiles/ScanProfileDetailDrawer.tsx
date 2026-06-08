'use client';

import { Button, Typography, Drawer, Flex, theme, Descriptions } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { CloseOutlined } from '@ant-design/icons';
import { SCANNER_LABELS } from '@/commons/constants/scan';
import type { ScanProfile } from '@/commons/types/scans';
import { StatusPill } from '@/components/shared/StatusPill';

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const PROFILE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'strict', label: 'Strict' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_FINDINGS = 2000;

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

  const profileTypeLabel = PROFILE_TYPE_OPTIONS.find(o => o.value === profile.profile)?.label ?? profile.profile;
  const severityLabel = SEVERITY_OPTIONS.find(o => o.value === profile.severityThreshold)?.label ?? profile.severityThreshold;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaIcon icon="fa-file-shield" style={{ color: token.colorPrimary, fontSize: 18 }} />
          <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{profile.name}</Typography.Text>
        </div>
      }
      placement="right"
      size="large"
      onClose={onClose}
      open={open}
      closeIcon={<CloseOutlined />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Overview */}
        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginSM, marginTop: 0, fontWeight: token.fontWeightStrong }}>Overview</Typography.Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Profile type">
              <StatusPill variant="blue">{profileTypeLabel}</StatusPill>
            </Descriptions.Item>
            <Descriptions.Item label="AI verification">
              <StatusPill variant={profile.aiVerification ? 'teal' : 'slate'}>{profile.aiVerification ? 'Enabled' : 'Disabled'}</StatusPill>
            </Descriptions.Item>
            <Descriptions.Item label="Severity gate">
              <Typography.Text strong>{severityLabel}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Timeout">
              <Typography.Text>{profile.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS}s</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Max findings">
              <Typography.Text>{profile.maxFindings || DEFAULT_MAX_FINDINGS}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </section>

        {/* Scanners */}
        <section>
          <Typography.Title level={5} style={{ marginBottom: token.marginSM, marginTop: 0, fontWeight: token.fontWeightStrong }}>Scanners</Typography.Title>
          <Flex wrap="wrap" gap={token.paddingSM}>
            {profile.scanners.map((s) => <StatusPill key={s} variant="slate">{SCANNER_LABELS[s as keyof typeof SCANNER_LABELS] ?? s}</StatusPill>)}
          </Flex>
        </section>

        {/* Actions */}
        <section style={{ display: 'flex', gap: token.marginSM }}>
          <Button
            type="primary"
            block
            icon={<FaIcon icon="fa-pen" />}
            onClick={() => { onEdit(profile); onClose(); }}
            disabled={profile.isDefault}
          >
            Edit profile
          </Button>
          <Button
            block
            danger
            icon={<FaIcon icon="fa-trash" />}
            onClick={() => onDelete(profile)}
            disabled={profile.isDefault}
          >
            Delete
          </Button>
        </section>

      </div>
    </Drawer>
  );
}
