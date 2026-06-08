'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { ScanProfileDetailDrawer, EditScanProfileModal, CreateScanProfileModal, TemplatesModal } from '@/features/scan-profiles/ProfileModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useScanProfilesQuery, useCreateScanProfileMutation, useUpdateScanProfileMutation, useDeleteScanProfileMutation } from '@/modules/scan-profiles';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ScanProfile } from '@/commons/types/scans';
import { errorMessage } from '@/lib/api/errors';
import { App } from 'antd';
import { useConfirm } from '@/components/shared/ConfirmDialog';

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
    aiVerification: Boolean(p.aiVerification),
    severityThreshold: p.severityThreshold,
    timeoutSeconds: p.timeoutSeconds,
    maxFindings: p.maxFindings,
  };
}

function buildColumns(token: ReturnType<typeof theme.useToken>['token'], handleView: (p: ScanProfileRow) => void): DataTableColumn<ScanProfileRow>[] {
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
      key: 'scanners',
      header: 'Scanners',
      render: (row) => (
        <Flex gap={4} wrap="wrap">
          {row.scanners.map((s) => <StatusPill key={s} variant="slate">{s}</StatusPill>)}
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
  ];
}

export default function ScanProfilesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();

  const { params, setPage, setPageSize, setSearch } = useTableParams({
    defaultPageSize: 10,
  });

  const profilesQuery = useScanProfilesQuery({
    page: params.page,
    per_page: params.per_page,
    search: params.search || undefined,
  });
  const createMutation = useCreateScanProfileMutation();

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ScanProfileRow | null>(null);

  const updateMutation = useUpdateScanProfileMutation();
  const deleteMutation = useDeleteScanProfileMutation();

  const profiles = (profilesQuery.data?.data ?? []).map(mapProfile);

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
      { id: selectedProfile.id, data: { ...values, profile: values.profile as 'standard' | 'strict' | 'custom', severityThreshold: values.severityThreshold as 'low' | 'medium' | 'high' | 'critical' } },
      {
        onSuccess: () => { setEditOpen(false); message.success('Profile updated'); },
        onError: (err) => { message.error(errorMessage(err)); },
      },
    );
  };

  const handleCreate = (values: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => {
    createMutation.mutate({ ...values, profile: values.profile as 'standard' | 'strict' | 'custom', severityThreshold: values.severityThreshold as 'low' | 'medium' | 'high' | 'critical' }, {
      onSuccess: () => { setCreateOpen(false); message.success('Profile created'); },
      onError: (err) => { message.error(errorMessage(err)); },
    });
  };

  const handleTemplateSelect = (template: { name: string; profile: string; scanners: string[]; aiVerification: boolean; severityThreshold: string; timeoutSeconds: number; maxFindings: number }) => {
    createMutation.mutate({ ...template, profile: template.profile as 'standard' | 'strict' | 'custom', severityThreshold: template.severityThreshold as 'low' | 'medium' | 'high' | 'critical' }, {
      onSuccess: () => { setTemplatesOpen(false); message.success('Profile created from template'); },
      onError: (err) => { message.error(errorMessage(err)); },
    });
  };

  const handleDelete = (profile: ScanProfileRow) => {
    confirm({
      title: 'Delete scan profile?',
      content: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      okText: 'Delete',
      danger: true,
      onOk: () => {
        deleteMutation.mutate(profile.id, {
          onSuccess: () => {
            setDetailOpen(false);
            message.success('Profile deleted');
          },
          onError: (err) => { message.error(errorMessage(err)); },
        });
      },
    });
  };

  const columns = useMemo(() => buildColumns(token, handleView), [token, handleView]);

  const actions = useMemo<ActionConfig<ScanProfileRow>[]>(() => [
    { label: 'Preview', icon: <FaIcon icon="fa-eye" />, onClick: (profile) => handleView(profile) },
    { label: 'Edit', icon: <FaIcon icon="fa-pen" />, onClick: (profile) => handleEdit(profile), show: (profile) => !profile.isDefault },
  ], [handleView, handleEdit]);

  if (profilesQuery.isLoading) {
    return <LoadingState text="Loading scan profiles..." />;
  }

  if (profilesQuery.isError) {
    return <ErrorState title="Failed to load scan profiles" description={errorMessage(profilesQuery.error)} onRetry={() => profilesQuery.refetch()} />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Scan Profiles"
        description="Custom scan profiles for your workspace. A default profile (Standard) is always available when no custom profile is selected."
        actions={
          <Flex gap={token.marginSM}>
            <Button onClick={() => setTemplatesOpen(true)} icon={<FaIcon icon="fa-layer-group" />}>Templates</Button>
            <PermissionGate permission={PERMISSION.POLICY_MANAGE}>
              <Button type="primary" onClick={() => setCreateOpen(true)} icon={<FaIcon icon="fa-plus" />}>New profile</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <DataTable
        source={{ data: profiles, meta: { page: params.page, pageSize: params.per_page, total: profilesQuery.data?.meta.total ?? 0 } }}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
        emptyText="No custom profiles. Using default Standard profile."
        isLoading={profilesQuery.isLoading}
        searchable
        searchPlaceholder="Search profiles"
        searchValue={params.search}
        onSearchChange={setSearch}
        onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
      />

      <ScanProfileDetailDrawer open={detailOpen} profile={selectedProfile ? { ...selectedProfile, workspaceId: '', aiVerification: selectedProfile.aiVerification ? 'enabled' : 'disabled', createdAt: '' } : null} onClose={() => setDetailOpen(false)} onEdit={(p) => handleEdit(mapProfile(p))} onDelete={(p) => handleDelete(mapProfile(p))} />
      <EditScanProfileModal open={editOpen} profile={selectedProfile ? { ...selectedProfile, workspaceId: '', aiVerification: selectedProfile.aiVerification ? 'enabled' : 'disabled', createdAt: '' } : null} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <CreateScanProfileModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onSelect={handleTemplateSelect} />
    </Flex>
  );
}
