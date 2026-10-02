'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Input, Card, App, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Toolbar } from '@/components/shared/Toolbar';
import { TableFooter } from '@/components/shared/TableFooter';
import { ScanProfileDetailDrawer, EditScanProfileModal, CreateScanProfileModal, TemplatesModal } from '@/features/scan-profiles/ProfileModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { useSessionQuery } from '@/modules/auth/queries';
import { useScanProfilesQuery, useCreateScanProfileMutation, useUpdateScanProfileMutation, useDeleteScanProfileMutation } from '@/modules/scan-profiles';
import type { ScanProfile } from '@/modules/scan-profiles/api';
import { SCANNER_LABELS, DEFAULT_SCAN_PROFILE } from '@/commons/constants/scan';

const PROFILE_TYPE_LABEL: Record<string, string> = { standard: 'Standard', strict: 'Strict', custom: 'Custom' };
const PROFILE_VARIANT: Record<string, string> = { standard: 'blue', strict: 'purple', custom: 'amber' };
const SEVERITY_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

interface ScanProfileRow {
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

function mapProfile(p: ScanProfile): ScanProfileRow {
  return {
    id: p.id,
    name: p.name,
    profile: p.profile,
    scanners: p.scanners,
    aiVerification: p.aiVerification,
    severityThreshold: p.severityThreshold,
    timeoutSeconds: p.timeoutSeconds,
    maxFindings: p.maxFindings,
  };
}

/** Map the hardcoded default profile to table row shape. */
function mapDefaultProfile(): ScanProfileRow {
  return {
    id: DEFAULT_SCAN_PROFILE.id,
    name: DEFAULT_SCAN_PROFILE.name,
    profile: 'standard',
    scanners: [...DEFAULT_SCAN_PROFILE.scanners],
    aiVerification: DEFAULT_SCAN_PROFILE.aiMode === 'enabled',
    severityThreshold: DEFAULT_SCAN_PROFILE.severityThreshold,
    timeoutSeconds: 300,
    maxFindings: 2000,
    isDefault: true,
  };
}

function buildColumns(token: ReturnType<typeof theme.useToken>['token'], handleView: (p: ScanProfileRow) => void, handleEdit: (p: ScanProfileRow) => void): DataTableColumn<ScanProfileRow>[] {
  return [
    {
      key: 'name',
      header: 'Profile',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex align="center" gap={token.marginXS}>
          <Button type="link" onClick={() => handleView(row)} style={{ padding: 0, height: 'auto' }}>{row.name}</Button>
          {row.isDefault && <StatusPill variant="slate">Default</StatusPill>}
        </Flex>
      ),
    },
    {
      key: 'profile',
      header: 'Type',
      render: (row) => <StatusPill variant={(PROFILE_VARIANT[row.profile] ?? 'slate') as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{PROFILE_TYPE_LABEL[row.profile] ?? row.profile}</StatusPill>,
    },
    {
      key: 'scanners',
      header: 'Scanners',
      render: (row) => (
        <Flex gap={4} wrap="wrap">
          {row.scanners.map((s) => <StatusPill key={s} variant="slate">{SCANNER_LABELS[s as keyof typeof SCANNER_LABELS] ?? s}</StatusPill>)}
        </Flex>
      ),
    },
    {
      key: 'aiVerification',
      header: 'AI',
      render: (row) => <StatusPill variant={row.aiVerification ? 'teal' : 'amber'}>{row.aiVerification ? 'On' : 'Off'}</StatusPill>,
    },
    {
      key: 'severityThreshold',
      header: 'Severity',
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{SEVERITY_LABEL[row.severityThreshold] ?? row.severityThreshold}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleView(row); }}><FaIcon icon="fa-eye" /> Preview</Button>
          {!row.isDefault && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
          )}
        </Flex>
      ),
    },
  ];
}

export default function ScanProfilesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? '';

  const profilesQuery = useScanProfilesQuery(workspaceId);
  const createMutation = useCreateScanProfileMutation(workspaceId);

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ScanProfileRow | null>(null);

  const updateMutation = useUpdateScanProfileMutation(workspaceId);
  const deleteMutation = useDeleteScanProfileMutation(workspaceId);
  const { confirm } = useConfirm();

  const profiles = (profilesQuery.data ?? []).map(mapProfile);

  const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams<ScanProfileRow>({
    data: profiles,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleView = useCallback((profile: ScanProfileRow) => {
    setSelectedProfile(profile);
    setDetailOpen(true);
  }, []);

  const handleEdit = useCallback((profile: ScanProfileRow) => {
    setSelectedProfile(profile);
    setEditOpen(true);
  }, []);

  const handleSaveEdit = (values: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => {
    if (!selectedProfile) return;
    updateMutation.mutate(
      { id: selectedProfile.id, data: values },
      {
        onSuccess: () => { setEditOpen(false); message.success('Profile updated'); },
        onError: (err) => { message.error(err.message); },
      },
    );
  };

  const handleCreate = (values: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => {
    createMutation.mutate(values, {
      onSuccess: () => { setCreateOpen(false); message.success('Profile created'); },
      onError: (err) => { message.error(err.message); },
    });
  };

  const handleTemplateSelect = (template: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => {
    createMutation.mutate(template, {
      onSuccess: () => { setTemplatesOpen(false); message.success('Profile created from template'); },
      onError: (err) => { message.error(err.message); },
    });
  };

  const handleDelete = (profile: ScanProfileRow) => {
    confirm({
      title: 'Delete scan profile?',
      content: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      danger: true,
      okText: 'Delete',
      onOk: () => {
        deleteMutation.mutate(profile.id, {
          onSuccess: () => {
            setDetailOpen(false);
            message.success('Profile deleted');
          },
          onError: (err) => { message.error(err.message); },
        });
      },
    });
  };

  const columns = useMemo(() => buildColumns(token, handleView, handleEdit), [token, handleView, handleEdit]);

  if (!workspaceId) return <LoadingState text="Loading workspace..." />;

  if (profilesQuery.isLoading) {
    return <LoadingState variant="table" text="Loading scan profiles..." />;
  }

  if (profilesQuery.isError) {
    return <ErrorState title="Failed to load scan profiles" onRetry={() => profilesQuery.refetch()} retryText="Retry" />;
  }

  return (
    <Flex vertical gap={token.marginXL}>
      <PageHeader
        title="Scan Profiles"
        description="Custom scan profiles for your workspace. A default profile (Standard) is always available when no custom profile is selected."
        actions={
          <Flex gap={token.marginSM}>
            <Button onClick={() => setTemplatesOpen(true)}><FaIcon icon="fa-layer-group" /> Templates</Button>
            <PermissionGate permission={PERMISSION.POLICY_MANAGE}>
              <Button type="primary" onClick={() => setCreateOpen(true)}><FaIcon icon="fa-plus" /> New profile</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search profiles"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        <DataTable
            data={paginated ?? []}
            columns={columns}
            rowKey={(r) => r.id}
            emptyText="No custom profiles. Using default Standard profile."
          />
        <TableFooter
          current={params.page}
          pageSize={params.per_page}
          total={(filtered ?? []).length}
          onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        />
      </Card>

      <ScanProfileDetailDrawer open={detailOpen} profile={selectedProfile} onClose={() => setDetailOpen(false)} onEdit={handleEdit} onDelete={handleDelete} />
      <EditScanProfileModal open={editOpen} profile={selectedProfile} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <CreateScanProfileModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onSelect={handleTemplateSelect} />
    </Flex>
  );
}
