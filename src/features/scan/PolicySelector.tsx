'use client';

import { Select, Typography, Flex, theme } from 'antd';
import { StatusPill } from '@/components/shared/StatusPill';
import { RadioCardGroup } from '@/components/shared/RadioCardGroup';
import type { ScanPolicy } from './NewScanModal';

const { Text } = Typography;

const PROFILE_META: Record<string, { label: string; desc: string }> = {
  quick: { label: 'Quick Scan', desc: 'Semgrep + Gitleaks — fast PR gate (~3 min)' },
  standard: {
    label: 'Standard Scan',
    desc: 'Semgrep + Gitleaks + Trivy — balanced daily (~10 min)',
  },
  comprehensive: { label: 'Comprehensive', desc: 'All scanners — full release check (~25 min)' },
};

interface PolicySelectorProps {
  policies: ScanPolicy[];
  selectedPolicyId: string;
  isCustomized: boolean;
  profile: string;
  onPolicyChange: (policyId: string) => void;
  onProfileChange: (profile: string) => void;
}

export function PolicySelector({
  policies,
  selectedPolicyId,
  isCustomized,
  profile,
  onPolicyChange,
  onProfileChange,
}: PolicySelectorProps) {
  const { token } = theme.useToken();

  const policyOptions = policies.map((p) => ({
    value: p.id,
    label: (
      <Flex align="center" gap={token.paddingMD}>
        <span>{p.name}</span>
        {p.isDefault && (
          <StatusPill variant={'teal' as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>
            Default
          </StatusPill>
        )}
      </Flex>
    ),
  }));

  return (
    <>
      <Select
        onChange={onPolicyChange}
        options={policyOptions}
        style={{ width: '100%' }}
        value={selectedPolicyId}
      />
      {isCustomized && (
        <Flex
          align="center"
          gap={token.marginXXS}
          style={{ marginTop: -token.paddingSM, marginBottom: token.paddingMD }}
        >
          <StatusPill variant="amber">
            Customized
          </StatusPill>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            Settings differ from policy — running with your overrides
          </Text>
        </Flex>
      )}

      <RadioCardGroup
        ariaLabel="Scan profile"
        columns={2}
        options={Object.entries(PROFILE_META).map(([key, p]) => ({ key, label: p.label, description: p.desc }))}
        value={profile}
        onChange={onProfileChange}
      />
    </>
  );
}

export { PROFILE_META };
