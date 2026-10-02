'use client';

import { useMemo } from 'react';
import { Modal, Select, Switch, Typography, Divider, Button, Form, Tag, Flex, theme } from 'antd';
import { LAYOUT, MODAL_WIDTH, TRANSITION } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/fa-icon';
import { StatusPill } from '@/components/shared/StatusPill';
import { RadioCardGroup } from '@/components/shared/RadioCardGroup';
import type { ScanRepository, ScanConfig } from './types';

const { Text, Link } = Typography;

export interface ScanPolicy {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  ai: string;
  severity: string;
  isDefault: boolean;
}

interface NewScanModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ScanConfig) => void;
  repositories: ScanRepository[];
  policies: ScanPolicy[];
}

const PROFILE_META: Record<string, { label: string; desc: string }> = {
  quick: { label: 'Quick Scan', desc: 'Semgrep + Gitleaks — fast PR gate (~3 min)' },
  standard: {
    label: 'Standard Scan',
    desc: 'Semgrep + Gitleaks + Trivy — balanced daily (~10 min)',
  },
  comprehensive: { label: 'Comprehensive', desc: 'All scanners — full release check (~25 min)' },
};

export function NewScanModal({
  open,
  onClose,
  onConfirm,
  repositories,
  policies,
}: NewScanModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const SCANNERS = [
    {
      value: 'semgrep',
      label: 'Semgrep',
      icon: 'fa-code',
      color: token.colorSuccess,
      desc: 'SAST for code vulnerabilities',
    },
    {
      value: 'gitleaks',
      label: 'Gitleaks',
      icon: 'fa-key',
      color: token.colorWarning,
      desc: 'Secret detection in git history',
    },
    {
      value: 'trivy',
      label: 'Trivy',
      icon: 'fa-shield-halved',
      color: token.colorSuccess,
      desc: 'Dependency & container scanning',
    },
    {
      value: 'flawfinder',
      label: 'Flawfinder',
      icon: 'fa-bug',
      color: token.colorError,
      desc: 'C/C++ source code weaknesses',
    },
    {
      value: 'cppcheck',
      label: 'Cppcheck',
      icon: 'fa-cube',
      color: token.colorPurple,
      desc: 'C/C++ static analysis',
    },
    {
      value: 'sarif',
      label: 'SARIF',
      icon: 'fa-file-code',
      color: token.colorTextSecondary,
      desc: 'Generic SARIF format parser',
    },
  ];

  const PROVIDER_CONFIG: Record<
    string,
    { icon: string; label: string; color: string; bg: string }
  > = {
    github: { icon: 'fa-brands fa-github', label: 'GitHub', color: token.colorText, bg: token.colorBgLayout },
    gitlab: {
      icon: 'fa-brands fa-gitlab',
      label: 'GitLab',
      color: token.colorError,
      bg: token.colorErrorBg,
    },
    gitea: { icon: 'fa-code-branch', label: 'Gitea', color: token.colorSuccess, bg: token.colorTealBg },
  };

  const defaultPolicy = useMemo(() => policies.find((p) => p.isDefault) ?? policies[0], [policies]);

  const repoId = Form.useWatch('repositoryId', form);
  const branch = Form.useWatch('branch', form);
  const selectedPolicyId = Form.useWatch('policyId', form);
  const profile = Form.useWatch('profile', form);
  const scanners = Form.useWatch('scanners', form);

  const selectedRepo = useMemo(
    () => repositories.find((r) => r.id === repoId),
    [repositories, repoId]
  );
  const isManaged = selectedRepo?.connectionType === 'scm';
  const providerCfg = selectedRepo?.provider ? PROVIDER_CONFIG[selectedRepo.provider] : null;
  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === selectedPolicyId),
    [policies, selectedPolicyId]
  );

  const isCustomized = useMemo(() => {
    if (!selectedPolicy || !profile || !scanners) return false;
    const policyScanners = selectedPolicy.scanners.map((s) => s.toLowerCase());
    return (
      profile !== selectedPolicy.profile.toLowerCase() ||
      JSON.stringify([...scanners].sort()) !== JSON.stringify(policyScanners.sort())
    );
  }, [selectedPolicy, profile, scanners]);

  const repoOptions = repositories.map((r) => ({
    value: r.id,
    label: (
      <Flex align="center" gap={token.paddingMD}>
        <span>{r.name}</span>
        <Text
          style={{
            fontSize: token.fontSizeSM,
            color: r.connectionType === 'scm' ? token.colorPrimary : token.colorTextSecondary,
          }}
        >
          {r.connectionType === 'scm' ? r.provider?.toUpperCase() : 'CI Upload'}
        </Text>
      </Flex>
    ),
  }));

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

  const handleRepoChange = (value: string) => {
    const r = repositories.find((repo) => repo.id === value);
    form.setFieldsValue({ repositoryId: value, branch: r?.branch ?? 'main' });
  };

  const handlePolicyChange = (policyId: string) => {
    const policy = policies.find((p) => p.id === policyId);
    if (policy) {
      form.setFieldsValue({
        policyId,
        profile: policy.profile.toLowerCase(),
        scanners: policy.scanners.map((s) => s.toLowerCase()),
      });
    }
  };

  const handleProfileChange = (newProfile: string) => {
    form.setFieldsValue({ profile: newProfile });
  };

  const toggleScanner = (scanner: string) => {
    const current = form.getFieldValue('scanners') as string[];
    const next = current.includes(scanner)
      ? current.filter((s) => s !== scanner)
      : [...current, scanner];
    form.setFieldsValue({ scanners: next });
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      onConfirm({
        repositoryId: values.repositoryId,
        branch: values.branch,
        profile: values.profile,
        scanners: values.scanners,
      });
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap={token.paddingMD}>
          <div
            style={{
              width: LAYOUT.ICON_LG,
              height: LAYOUT.ICON_LG,
              borderRadius: token.borderRadiusLG,
              background: token.colorPrimary,
              color: token.colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FaIcon icon="fa-play" />
          </div>
          <div>
            <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeXL }}>
              New Scan
            </div>
            <Text type="secondary" style={{ fontSize: token.fontSize }}>
              {isManaged
                ? 'Configure and run a managed security scan'
                : 'Repository connected via CI upload'}
            </Text>
          </div>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={MODAL_WIDTH.XL}
      footer={
        isManaged ? (
          <Flex justify="flex-end" gap={token.paddingMD}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={!scanners || scanners.length === 0}
            >
              <FaIcon icon="fa-play" /> Start Scan
            </Button>
          </Flex>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          repositoryId: repositories[0]?.id ?? '',
          branch: repositories[0]?.branch ?? 'main',
          policyId: defaultPolicy?.id ?? '',
          profile: defaultPolicy?.profile?.toLowerCase() ?? 'standard',
          scanners: defaultPolicy?.scanners?.map((s) => s.toLowerCase()) ?? ['semgrep', 'gitleaks'],
        }}
      >
        <Flex vertical gap={token.paddingLG}>
          {/* Repository */}
          <Form.Item label="Repository" name="repositoryId">
            <Select onChange={handleRepoChange} options={repoOptions} style={{ width: '100%' }} />
          </Form.Item>

          {/* Provider Badge */}
          {isManaged && providerCfg && (
            <Flex
              align="center"
              gap={token.paddingSM}
              style={{
                padding: `${token.paddingSM}px ${token.paddingMD}px`,
                background: token.colorBgLayout,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <FaIcon
                icon={providerCfg.icon}
                style={{ color: providerCfg.color, fontSize: token.fontSizeLG }}
              />
              <Text
                style={{
                  fontSize: token.fontSize,
                  fontWeight: token.fontWeightStrong,
                  color: token.colorText,
                }}
              >
                {providerCfg.label}
              </Text>
              <Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>•</Text>
              <Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>
                SCM connected — platform can run scans
              </Text>
            </Flex>
          )}

          {/* External Repo Info */}
          {!isManaged && (
            <div
              style={{
                padding: token.paddingLG,
                background: token.colorWarningBg,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorWarning}`,
              }}
            >
              <Flex align="flex-start" gap={token.paddingMD}>
                <FaIcon icon="fa-triangle-exclamation" style={{ color: token.colorWarningDark, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: token.fontWeightStrong,
                      fontSize: token.fontSize,
                      color: token.colorWarningDark,
                      marginBottom: token.marginXXS,
                    }}
                  >
                    CI Upload Only
                  </div>
                  <Text
                    style={{
                      fontSize: token.fontSize,
                      color: token.colorWarningDark,
                      display: 'block',
                      marginBottom: token.paddingMD,
                    }}
                  >
                    This repository is connected via CI upload. Scans cannot be triggered from the
                    platform.
                  </Text>
                  <div style={{ fontSize: token.fontSize, color: token.colorWarningDark, lineHeight: '20px' }}>
                    <div style={{ marginBottom: token.marginXXS }}>
                      <strong>To run a scan:</strong>
                    </div>
                    <Flex gap={token.paddingSM} align="center" style={{ marginBottom: token.marginXXS }}>
                      <span
                        style={{
                          width: LAYOUT.ICON_SM,
                          height: LAYOUT.ICON_SM,
                          borderRadius: token.borderRadiusLG,
                          background: token.colorWarningDark,
                          color: token.colorText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: token.fontSizeSM,
                          fontWeight: token.fontWeightStrong,
                        }}
                      >
                        1
                      </span>
                      Configure your CI pipeline with scanner commands
                    </Flex>
                    <Flex gap={token.paddingSM} align="center" style={{ marginBottom: token.marginXXS }}>
                      <span
                        style={{
                          width: LAYOUT.ICON_SM,
                          height: LAYOUT.ICON_SM,
                          borderRadius: token.borderRadiusLG,
                          background: token.colorWarningDark,
                          color: token.colorText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: token.fontSizeSM,
                          fontWeight: token.fontWeightStrong,
                        }}
                      >
                        2
                      </span>
                      Upload results via{' '}
                      <code
                        style={{
                          padding: '1px 4px',
                          background: 'rgba(0,0,0,0.06)',
                          borderRadius: 3,
                          fontSize: token.fontSizeSM,
                        }}
                      >
                        POST /projects/{'{'}id{'}'}/scans/upload
                      </code>
                    </Flex>
                    <Flex gap={token.paddingSM} align="center">
                      <span
                        style={{
                          width: LAYOUT.ICON_SM,
                          height: LAYOUT.ICON_SM,
                          borderRadius: token.borderRadiusLG,
                          background: token.colorWarningDark,
                          color: token.colorText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: token.fontSizeSM,
                          fontWeight: token.fontWeightStrong,
                        }}
                      >
                        3
                      </span>
                      Results appear here automatically
                    </Flex>
                  </div>
                  <Flex style={{ marginTop: token.paddingMD }} gap={token.paddingMD}>
                    <Link
                      href="/docs/upload-api"
                      style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong }}
                    >
                      <FaIcon icon="fa-book" /> Upload API Docs
                    </Link>
                    <Link
                      href="/docs/ci-integration"
                      style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong }}
                    >
                      <FaIcon icon="fa-diagram-project" /> CI Integration Guide
                    </Link>
                  </Flex>
                </div>
              </Flex>
            </div>
          )}

          {/* Managed Scan Config */}
          {isManaged && (
            <>
              <Form.Item label="Branch" name="branch">
                <Select
                  showSearch
                  placeholder="Search branches..."
                  options={[
                    { value: 'main', label: 'main' },
                    { value: 'develop', label: 'develop' },
                    { value: 'release', label: 'release' },
                  ]}
                  style={{ width: '100%' }}
                  filterOption={(input, option) =>
                    (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              <Text
                type="secondary"
                style={{
                  fontSize: token.fontSizeSM,
                  marginTop: -token.paddingSM,
                  display: 'block',
                }}
              >
                {providerCfg?.label} branch list • auto-detected from repository
              </Text>

              <Form.Item label="Scan Policy" name="policyId">
                <Select
                  onChange={handlePolicyChange}
                  options={policyOptions}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {isCustomized && (
                <Flex
                  align="center"
                  gap={token.marginXXS}
                  style={{ marginTop: -token.paddingSM, marginBottom: token.paddingMD }}
                >
                  <Tag color="gold" style={{ margin: 0 }}>
                    Customized
                  </Tag>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    Settings differ from policy — running with your overrides
                  </Text>
                </Flex>
              )}

              <Form.Item label="Scan Profile" name="profile">
                <RadioCardGroup
                  ariaLabel="Scan profile"
                  columns={2}
                  options={Object.entries(PROFILE_META).map(([key, p]) => ({ key, label: p.label, description: p.desc }))}
                  value={profile}
                  onChange={handleProfileChange}
                />
              </Form.Item>

              <Form.Item label="Scanners" name="scanners">
                <div
                  role="group"
                  aria-label="Scanner selection"
                  style={{ display: 'grid', gap: token.paddingSM }}
                >
                  {SCANNERS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="checkbox"
                      aria-checked={scanners?.includes(s.value) ?? false}
                      onClick={() => toggleScanner(s.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: token.paddingMD,
                        padding: `${token.paddingMD}px ${token.paddingLG}px`,
                        borderRadius: token.borderRadiusLG,
                        border: scanners?.includes(s.value)
                          ? `2px solid ${s.color}`
                          : `1px solid ${token.colorBorderSecondary}`,
                        background: scanners?.includes(s.value)
                          ? `${s.color}11`
                          : token.colorBgContainer,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: `all ${TRANSITION.FAST}`,
                      }}
                    >
                      <Flex align="center" gap={token.paddingMD}>
                        <FaIcon
                          icon={s.icon}
                          style={{
                            color: scanners?.includes(s.value) ? s.color : token.colorTextSecondary,
                            fontSize: token.fontSizeLG,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: token.fontWeightStrong,
                              fontSize: token.fontSize,
                              color: scanners?.includes(s.value) ? s.color : token.colorText,
                            }}
                          >
                            {s.label}
                          </div>
                          <div
                            style={{
                              fontSize: token.fontSize,
                              color: token.colorTextSecondary,
                              marginTop: 2,
                            }}
                          >
                            {s.desc}
                          </div>
                        </div>
                      </Flex>
                      {scanners?.includes(s.value) && (
                        <FaIcon
                          icon="fa-check-circle"
                          style={{ color: s.color, fontSize: token.fontSizeLG }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </Form.Item>
              {(!scanners || scanners.length === 0) && (
                <Text
                  type="secondary"
                  style={{
                    fontSize: token.fontSize,
                    marginTop: -token.paddingSM,
                    marginBottom: token.paddingMD,
                    display: 'block',
                  }}
                >
                  Select at least one scanner to proceed.
                </Text>
              )}

              <Divider style={{ margin: `${token.marginXXS}px 0` }} />

              <Flex justify="space-between" align="center">
                <div>
                  <div
                    style={{
                      fontWeight: token.fontWeightStrong,
                      fontSize: token.fontSize,
                      color: token.colorText,
                    }}
                  >
                    Run immediately
                  </div>
                  <Text type="secondary" style={{ fontSize: token.fontSize }}>
                    Scan will start as soon as you confirm
                  </Text>
                </div>
                <Switch checked disabled />
              </Flex>

              <div
                style={{
                  padding: `${token.paddingMD}px ${token.paddingLG}px`,
                  background: token.colorBgLayout,
                  borderRadius: token.borderRadiusLG,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div
                  style={{
                    fontSize: token.fontSize,
                    fontWeight: token.fontWeightStrong,
                    color: token.colorTextSecondary,
                    marginBottom: token.paddingSM,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Scan Summary
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: token.paddingSM,
                    fontSize: token.fontSize,
                  }}
                >
                  <div>
                    <Text type="secondary">Repository:</Text> <strong>{selectedRepo?.name}</strong>
                  </div>
                  <div>
                    <Text type="secondary">Provider:</Text> <strong>{providerCfg?.label}</strong>
                  </div>
                  <div>
                    <Text type="secondary">Branch:</Text> <strong>{branch}</strong>
                  </div>
                  <div>
                    <Text type="secondary">Policy:</Text>{' '}
                    <strong>{selectedPolicy?.name ?? 'None'}</strong>
                  </div>
                  <div>
                    <Text type="secondary">Profile:</Text>{' '}
                    <strong>{PROFILE_META[profile]?.label ?? profile}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Text type="secondary">Scanners:</Text>{' '}
                    <strong>
                      {scanners
                        ?.map((s: string) => SCANNERS.find((sc) => sc.value === s)?.label)
                        .join(', ') || 'None'}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </Flex>
      </Form>
    </Modal>
  );
}
