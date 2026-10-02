'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Input, Card, App, Flex, Typography, theme } from 'antd';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { Toolbar } from '@/components/shared/Toolbar';
import { TableFooter } from '@/components/shared/TableFooter';
import { PolicyDetailDrawer, EditPolicyModal, CreatePolicyModal, TemplatesModal } from '@/features/scan-policies/PolicyModals';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';
import { StatusPill } from '@/components/shared/StatusPill';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useSessionQuery } from '@/modules/auth/queries';
import { useScanPoliciesQuery, useCreateScanPolicyMutation, useUpdateScanPolicyMutation } from '@/modules/scan-policies';
import type { ScanPolicy } from '@/modules/scan-policies/api';

interface Policy {
  id: string;
  name: string;
  profile: string;
  scanners: string[];
  ai: string;
  severity: string;
  isDefault: boolean;
}

function mapPolicy(p: ScanPolicy): Policy {
  return {
    id: p.id,
    name: p.name,
    profile: p.scanners.length > 2 ? 'Comprehensive' : p.scanners.length === 1 ? 'Quick' : 'Standard',
    scanners: p.scanners,
    ai: p.aiVerification ? 'Enabled' : 'Disabled',
    severity: p.severityThreshold,
    isDefault: p.enabled,
  };
}

const PROFILE_VARIANT: Record<string, string> = { Quick: 'slate', Standard: 'blue', Comprehensive: 'purple' };

function buildColumns(token: ReturnType<typeof theme.useToken>['token'], handleView: (p: Policy) => void, handleEdit: (p: Policy) => void, handleSetDefault: (p: Policy) => void): DataTableColumn<Policy>[] {
  return [
    {
      key: 'name',
      header: 'Policy',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => (
        <Flex align="center" gap={8}>
          <Button type="link" onClick={() => handleView(row)} style={{ padding: 0, height: 'auto' }}>{row.name}</Button>
          {row.isDefault && <StatusPill variant="teal">Default</StatusPill>}
        </Flex>
      ),
    },
    {
      key: 'profile',
      header: 'Profile',
      render: (row) => <StatusPill variant={(PROFILE_VARIANT[row.profile] ?? 'slate') as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{row.profile}</StatusPill>,
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
      key: 'ai',
      header: 'AI verification',
      render: (row) => <StatusPill variant={row.ai === 'Enabled' ? 'teal' : 'amber'}>{row.ai}</StatusPill>,
    },
    {
      key: 'severity',
      header: 'Severity gate',
      render: (row) => <Typography.Text style={{ color: token.colorTextSecondary }}>{row.severity}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          {!row.isDefault && (
            <Button size="small" onClick={(e) => { e.stopPropagation(); handleSetDefault(row); }}>
              <FaIcon icon="fa-star" /> Set default
            </Button>
          )}
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleView(row); }}><FaIcon icon="fa-eye" /> Preview</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><FaIcon icon="fa-pen" /> Edit</Button>
        </Flex>
      ),
    },
  ];
}

export default function ScanPoliciesPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();

  const policiesQuery = useScanPoliciesQuery();
  const createMutation = useCreateScanPolicyMutation();

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const updateMutation = useUpdateScanPolicyMutation();

  const policies = (policiesQuery.data ?? []).map(mapPolicy);

  const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams<Policy>({
    data: policies,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleView = useCallback((policy: Policy) => {
    setSelectedPolicy(policy);
    setDetailOpen(true);
  }, []);

  const handleEdit = useCallback((policy: Policy) => {
    setSelectedPolicy(policy);
    setEditOpen(true);
  }, []);

  const handleSetDefault = useCallback((policy: Policy) => {
    updateMutation.mutate(
      { id: policy.id, data: { name: policy.name, scanners: policy.scanners, aiVerification: policy.ai === 'Enabled', severityThreshold: policy.severity as ScanPolicy['severityThreshold'] } },
      {
        onSuccess: () => { message.success('Default policy updated'); },
        onError: (err) => { message.error(err.message); },
      },
    );
  }, [updateMutation, message]);

  const handleSaveEdit = (values: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => {
    if (!selectedPolicy) return;
    updateMutation.mutate(
      { id: selectedPolicy.id, data: { name: values.name, scanners: values.scanners, aiVerification: values.ai === 'Enabled', severityThreshold: values.severity as ScanPolicy['severityThreshold'] } },
      {
        onSuccess: () => { setEditOpen(false); message.success('Policy updated'); },
        onError: (err) => { message.error(err.message); },
      },
    );
  };

  const handleCreate = (values: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => {
    createMutation.mutate(
      { name: values.name, scanners: values.scanners, aiVerification: values.ai === 'Enabled', severityThreshold: values.severity as ScanPolicy['severityThreshold'] },
      {
        onSuccess: () => { setCreateOpen(false); message.success('Policy created'); },
        onError: (err) => { message.error(err.message); },
      },
    );
  };

  const handleTemplateSelect = (template: { name: string; profile: string; scanners: string[]; ai: string; severity: string }) => {
    createMutation.mutate(
      { name: template.name, scanners: template.scanners, aiVerification: template.ai === 'Enabled', severityThreshold: template.severity as ScanPolicy['severityThreshold'] },
      {
        onSuccess: () => { setTemplatesOpen(false); message.success('Policy created from template'); },
        onError: (err) => { message.error(err.message); },
      },
    );
  };

  const columns = useMemo(() => buildColumns(token, handleView, handleEdit, handleSetDefault), [token, handleView, handleEdit, handleSetDefault]);

  if (policiesQuery.isLoading) {
    return <LoadingState text="Loading scan policies..." />;
  }

  if (policiesQuery.isError) {
    return <ErrorState title="Failed to load scan policies" onRetry={() => policiesQuery.refetch()} retryText="Retry" />;
  }

  return (
    <Flex vertical gap={token.marginXL}>
      <PageHeader
        title="Scan Policies"
        description="Define which scanners and profiles to apply across repositories. The default policy is used when starting a new scan."
        actions={
          <Flex gap={token.marginSM}>
            <Button onClick={() => setTemplatesOpen(true)}><FaIcon icon="fa-layer-group" /> Templates</Button>
            <PermissionGate permission={PERMISSION.POLICY_MANAGE}>
              <Button type="primary" onClick={() => setCreateOpen(true)}><FaIcon icon="fa-plus" /> New policy</Button>
            </PermissionGate>
          </Flex>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Toolbar>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search policies"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        <DataTable
            data={paginated}
            columns={columns}
            rowKey={(r) => r.id}
            emptyText="No policies defined."
          />
        <TableFooter
          current={params.page}
          pageSize={params.per_page}
          total={filtered.length}
          onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
        />
      </Card>

      <PolicyDetailDrawer open={detailOpen} policy={selectedPolicy} onClose={() => setDetailOpen(false)} onEdit={handleEdit} />
      <EditPolicyModal open={editOpen} policy={selectedPolicy} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
      <CreatePolicyModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} />
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onSelect={handleTemplateSelect} />
    </Flex>
  );
}
