'use client';

import { useMemo } from 'react';
import { Modal, Select, Typography, Button, Form, Flex, theme } from 'antd';
import { MODAL_WIDTH } from '@/commons/constants/layout';
import { FaIcon } from '@/commons/components/FaIcon';
import { createScanSchema } from '@/commons/schemas/scan.schema';
import { createZodSync } from '@/lib/utils/zod-sync';
import { useScannerAvailabilityQuery, useRepositoryBranchesQuery } from '@/modules/scan/queries';
import type { ScanConfig } from './types';

const { Text } = Typography;

interface NewScanModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ScanConfig) => void;
  repositories: Array<{ id: string; name: string; branch: string; provider: string | null; connectionType: string[] }>;
}

const SCANNER_DEFS = [
  { value: 'semgrep', label: 'Semgrep', icon: 'fa-code', desc: 'SAST' },
  { value: 'gitleaks', label: 'Gitleaks', icon: 'fa-key', desc: 'Secrets' },
  { value: 'cppcheck', label: 'Cppcheck', icon: 'fa-cube', desc: 'C/C++' },
  { value: 'flawfinder', label: 'Flawfinder', icon: 'fa-bug', desc: 'C/C++' },
  { value: 'clang-tidy', label: 'Clang-Tidy', icon: 'fa-magnifying-glass', desc: 'C/C++ Analysis' },
  { value: 'gcc-fanalyzer', label: 'GCC Fanalyzer', icon: 'fa-chart-line', desc: 'C/C++ Static' },
];

/**
 * Modal for creating a new scan with repository, branch, and scanner selection.
 *
 * Validates input via Zod schema and queries available scanners and repository branches.
 *
 * @param props - {@link NewScanModalProps}
 * @returns JSX element rendering the new scan creation modal.
 *
 * @example
 * <NewScanModal
 *   open={true}
 *   onClose={() => setOpen(false)}
 *   onConfirm={(config) => startScan(config)}
 *   repositories={[{ id: '1', name: 'repo', branch: 'main', provider: 'github', connectionType: ['app'] }]}
 * />
 */
export function NewScanModal({ open, onClose, onConfirm, repositories }: NewScanModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const rule = createZodSync(createScanSchema);

  const { data: availability } = useScannerAvailabilityQuery();

  const repoId = Form.useWatch('repositoryId', form);
  const scanners = Form.useWatch('scanners', form);

  // Fetch branches from SCM when repository is selected
  const { data: scmBranches, isLoading: branchesLoading } = useRepositoryBranchesQuery(repoId ?? '');

  // Filter scanners to only show available ones
  const availableScanners = useMemo(() => {
    if (!availability) return SCANNER_DEFS; // Show all while loading
    return SCANNER_DEFS.filter((s) => availability[s.value as keyof typeof availability]);
  }, [availability]);

  const repoOptions = useMemo(() => repositories.map((r) => ({
    value: r.id,
    label: (
      <Flex align="center" gap={token.paddingSM}>
        <Text strong>{r.name}</Text>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{r.provider?.toUpperCase() || 'SCM'}</Text>
      </Flex>
    ),
  })), [repositories, token]);

  const selectedRepo = useMemo(() => repositories.find((r) => r.id === repoId), [repositories, repoId]);

  // Build branch options: SCM branches + fallback
  const branchOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    // Add SCM branches if available
    if (scmBranches && scmBranches.length > 0) {
      for (const branch of scmBranches) {
        if (!seen.has(branch)) {
          options.push({ value: branch, label: branch });
          seen.add(branch);
        }
      }
    }

    // Add default branch if not already in list
    const defaultBranch = selectedRepo?.branch ?? 'main';
    if (!seen.has(defaultBranch)) {
      options.unshift({ value: defaultBranch, label: `${defaultBranch} (default)` });
    }

    return options;
  }, [scmBranches, selectedRepo]);

  const handleRepoChange = (value: string) => {
    const r = repositories.find((repo) => repo.id === value);
    form.setFieldsValue({ repositoryId: value, branch: r?.branch ?? 'main' });
  };

  const toggleScanner = (scanner: string) => {
    const current = (form.getFieldValue('scanners') as string[]) ?? [];
    const next = current.includes(scanner) ? current.filter((s) => s !== scanner) : [...current, scanner];
    form.setFieldsValue({ scanners: next });
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      // Only send available scanners
      const selectedScanners = (values.scanners ?? ['semgrep', 'gitleaks']).filter(
        (s: string) => availability?.[s as keyof typeof availability] ?? true
      );
      onConfirm({
        repositoryId: values.repositoryId,
        branch: values.branch,
        scanners: selectedScanners,
      });
    } catch { /* validation failed */ }
  };

  return (
    <Modal
      title={
        <Flex align="center" gap={token.paddingMD}>
          <FaIcon icon="fa-play" style={{ color: token.colorPrimary, fontSize: token.fontSizeLG }} />
          <div>
            <Text strong style={{ fontSize: token.fontSizeLG }}>New Scan</Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block' }}>Configure and run a security scan</Text>
          </div>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={MODAL_WIDTH.MD}
      footer={
        <Flex justify="flex-end" gap={token.paddingMD}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleConfirm} disabled={!scanners || scanners.length === 0}>
            <FaIcon icon="fa-play" /> Start Scan
          </Button>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          repositoryId: repositories[0]?.id ?? '',
          branch: repositories[0]?.branch ?? 'main',
          scanners: ['semgrep', 'gitleaks'],
        }}
      >
        <Flex vertical gap={token.paddingLG}>
          <Form.Item label="Repository" name="repositoryId" rules={[rule]}>
            <Select
              showSearch
              placeholder="Select a repository"
              onChange={handleRepoChange}
              options={repoOptions}
              filterOption={(input, option) => {
                const label = repositories.find((r) => r.id === option?.value)?.name ?? '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            />
          </Form.Item>

          <Form.Item label="Branch" name="branch" rules={[rule]}>
            <Select
              showSearch
              placeholder={branchesLoading ? 'Loading branches...' : 'Select branch'}
              loading={branchesLoading}
              options={branchOptions}
              filterOption={(input, option) => (option?.value as string)?.toLowerCase().includes(input.toLowerCase())}
              notFoundContent={branchesLoading ? 'Loading...' : 'No branches found'}
            />
          </Form.Item>

          <Form.Item label="Scanners" name="scanners" rules={[rule]}>
            <Flex wrap gap={token.paddingSM}>
              {availableScanners.map((s) => {
                const active = scanners?.includes(s.value);
                return (
                  <Button
                    key={s.value}
                    type={active ? 'primary' : 'default'}
                    onClick={() => toggleScanner(s.value)}
                    icon={<FaIcon icon={s.icon} />}
                    style={{ borderColor: active ? token.colorPrimary : token.colorBorderSecondary }}
                  >
                    {s.label}
                  </Button>
                );
              })}
              {availableScanners.length === 0 && (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  No scanners installed on this host.
                </Text>
              )}
            </Flex>
          </Form.Item>
        </Flex>
      </Form>
    </Modal>
  );
}
