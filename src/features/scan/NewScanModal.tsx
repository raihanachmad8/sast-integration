'use client';

import { useMemo } from 'react';
import { Modal, Select, Typography, Button, Form, Flex, theme } from 'antd';
import { LAYOUT, MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/components/shared/FaIcon';
import { createScanSchema } from '@/commons/schemas/scan.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { PolicySelector, PROFILE_META } from './PolicySelector';
import { ScanConfigForm } from './ScanConfigForm';
import { ScanSummary } from './ScanSummary';
import type { ScanRepository, ScanConfig } from './types';

const { Text } = Typography;

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

export function NewScanModal({
  open,
  onClose,
  onConfirm,
  repositories,
  policies,
}: NewScanModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(createScanSchema);

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

  const scannerLabels: Record<string, string> = Object.fromEntries(
    SCANNERS.map((s) => [s.value, s.label])
  );

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
          <Form.Item label="Repository" name="repositoryId" rules={[rule]}>
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
                <FaIcon icon="fa-triangle-exclamation" style={{ color: token.colorWarning, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: token.fontWeightStrong,
                      fontSize: token.fontSize,
                      color: token.colorWarning,
                      marginBottom: token.marginXXS,
                    }}
                  >
                    CI Upload Only
                  </div>
                  <Text
                    style={{
                      fontSize: token.fontSize,
                      color: token.colorWarning,
                      display: 'block',
                      marginBottom: token.paddingMD,
                    }}
                  >
                    This repository is connected via CI upload. Scans cannot be triggered from the
                    platform.
                  </Text>
                  <div style={{ fontSize: token.fontSize, color: token.colorWarning, lineHeight: '20px' }}>
                    <div style={{ marginBottom: token.marginXXS }}>
                      <strong>To run a scan:</strong>
                    </div>
                    <Flex gap={token.paddingSM} align="center" style={{ marginBottom: token.marginXXS }}>
                      <span
                        style={{
                          width: LAYOUT.ICON_SM,
                          height: LAYOUT.ICON_SM,
                          borderRadius: token.borderRadiusLG,
                          background: token.colorWarning,
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
                          background: token.colorWarning,
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
                          background: token.colorFillTertiary,
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
                          background: token.colorWarning,
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
                    <Typography.Link
                      href="/docs/upload-api"
                      style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong }}
                    >
                      <FaIcon icon="fa-book" /> Upload API Docs
                    </Typography.Link>
                    <Typography.Link
                      href="/docs/ci-integration"
                      style={{ fontSize: token.fontSize, fontWeight: token.fontWeightStrong }}
                    >
                      <FaIcon icon="fa-diagram-project" /> CI Integration Guide
                    </Typography.Link>
                  </Flex>
                </div>
              </Flex>
            </div>
          )}

          {/* Managed Scan Config */}
          {isManaged && (
            <>
              <Form.Item label="Branch" name="branch" rules={[rule]}>
                <ScanConfigForm
                  scanners={SCANNERS}
                  selectedScanners={scanners ?? []}
                  branch={branch ?? 'main'}
                  providerLabel={providerCfg?.label}
                  onToggleScanner={toggleScanner}
                />
              </Form.Item>

              <Form.Item label="Scan Policy" name="policyId">
                <PolicySelector
                  policies={policies}
                  selectedPolicyId={selectedPolicyId ?? ''}
                  isCustomized={isCustomized}
                  profile={profile ?? ''}
                  onPolicyChange={handlePolicyChange}
                  onProfileChange={handleProfileChange}
                />
              </Form.Item>

              <Form.Item label="Scan Profile" name="profile" hidden>
                <div />
              </Form.Item>

              <Form.Item label="Scanners" name="scanners" hidden>
                <div />
              </Form.Item>

              <ScanSummary
                repoName={selectedRepo?.name}
                providerLabel={providerCfg?.label}
                branch={branch}
                selectedPolicy={selectedPolicy}
                profile={PROFILE_META[profile]?.label ?? profile}
                scanners={scanners ?? []}
                scannerLabels={scannerLabels}
              />
            </>
          )}
        </Flex>
      </Form>
    </Modal>
  );
}
