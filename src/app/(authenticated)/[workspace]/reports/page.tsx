'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, App, Typography, Flex, Select, theme } from 'antd';
import dynamic from 'next/dynamic';

import { ErrorState } from '@/commons/components/ErrorState';
import { FaIcon } from '@/commons/components/FaIcon';
import { LoadingState } from '@/commons/components/LoadingState';
import { PageHeader } from '@/commons/components/PageHeader';
import { PermissionGate, PermissionHint } from '@/commons/components/PermissionGate';
import { StatusPill } from '@/commons/components/StatusPill';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/commons/components/DataTable';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';
import { PERMISSION } from '@/commons/constants/permissions';
import { ComingSoonCard } from '@/commons/components/ComingSoonCard';
import { useConfirm } from '@/commons/components/ConfirmDialog';
import { errorMessage } from '@/lib/api/errors';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { useReportsQuery, useGenerateReportMutation, useDeleteReportMutation } from '@/modules/reports';
import { reportsApi } from '@/modules/reports/api';
import type { ReportRow } from '@/commons/types/reports';
import { FeatureGate } from '@/commons/components/FeatureGate';

const ReportPreviewModal = dynamic(
  () => import('@/features/reports/ReportPreviewModal').then((m) => m.ReportPreviewModal),
  { ssr: false },
);

const FORMAT_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = { pdf: 'red', xlsx: 'teal', csv: 'blue' };

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'csv', label: 'CSV' },
];

const RANGE_OPTIONS = [
  { value: 'Last 7 days', label: 'Last 7 days' },
  { value: 'Last 30 days', label: 'Last 30 days' },
  { value: 'Last 90 days', label: 'Last 90 days' },
  { value: 'All time', label: 'All time' },
];

function buildColumns(): DataTableColumn<ReportRow>[] {
  return [
    {
      key: 'title',
      header: 'Report',
      sortable: true,
      sortValue: (row) => row.title,
      render: (row) => <Typography.Text strong>{row.title}</Typography.Text>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Typography.Text type="secondary">{row.type}</Typography.Text>,
    },
    {
      key: 'format',
      header: 'Format',
      render: (row) => <StatusPill variant={FORMAT_VARIANT[row.format ?? ''] ?? 'slate'}>{(row.format ?? '—').toUpperCase()}</StatusPill>,
    },
    {
      key: 'createdByName',
      header: 'Author',
      render: (row) => <Typography.Text type="secondary">{row.createdByName ?? '—'}</Typography.Text>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => <Typography.Text type="secondary">{new Date(row.createdAt).toLocaleDateString()}</Typography.Text>,
    },
  ];
}

/**
 * Reports page — generate and view security reports.
 *
 * Routes: `/{workspaceSlug}/reports`
 */
export default function ReportsPage() {
  const { token } = theme.useToken();

  return (
    <FeatureGate
      flag={FEATURE_FLAG.REPORTS}
      fallback={
        <Flex vertical gap={token.paddingXL}>
          <PageHeader title="Reports" description="Generate and download security reports." />
          <ComingSoonCard
            icon="fa-file-lines"
            title="Reports"
            description="Reports allow you to generate and export security findings."
            envHint="FEATURE_FLAG_REPORTS"
          />
        </Flex>
      }
    >
      <ReportsPageContent />
    </FeatureGate>
  );
}

function ReportsPageContent() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const { workspaceId } = useWorkspace();
  const { has } = usePermissions();
  const canView = has(PERMISSION.REPORT_VIEW);
  const canExport = has(PERMISSION.REPORT_EXPORT);

  const REPORT_TYPE = { id: 'findings', name: 'Security Report', icon: 'fa-shield-halved', description: 'Full security audit report with findings, severity, CWE, and remediation guidance' };

  const { params, setPagination, setSearch } = useTableParams({
    defaultPageSize: 10,
  });

  const reportsQuery = useReportsQuery({
    page: params.page,
    perPage: params.perPage,
    search: params.search || undefined,
  });
  const generateMutation = useGenerateReportMutation();
  const deleteMutation = useDeleteReportMutation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [selectedRange, setSelectedRange] = useState<string>('Last 30 days');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const handleGenerate = () => {
    generateMutation.mutate(
      { type: REPORT_TYPE.id, title: REPORT_TYPE.name, format: selectedFormat, range: selectedRange },
      {
        onSuccess: () => { setGenerateOpen(false); message.success('Report generated'); },
        onError: (err: Error) => message.error(errorMessage(err)),
      },
    );
  };

  const handlePreview = useCallback((report: ReportRow) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  }, []);

  const handleDownload = useCallback(async (report: ReportRow) => {
    if (!workspaceId) return;
    try {
      const url = await reportsApi.getDownloadUrl(workspaceId, report.id);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${window.__accessToken ?? ''}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.${report.format ?? 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      message.success('Download complete');
    } catch {
      message.error('Download failed');
    }
  }, [workspaceId, message]);

  const handleDelete = useCallback((report: ReportRow) => {
    confirm({
      title: 'Delete report?',
      content: `Are you sure you want to delete "${report.title}"?`,
      okText: 'Delete',
      danger: true,
      onOk: () => {
        deleteMutation.mutate(report.id, {
          onSuccess: () => message.success('Report deleted'),
          onError: (err: Error) => message.error(errorMessage(err)),
        });
      },
    });
  }, [confirm, deleteMutation, message]);

  const columns = useMemo(() => buildColumns(), []);

  const actions = useMemo<ActionConfig<ReportRow>[]>(() => [
    { label: 'Preview', icon: <FaIcon icon="fa-eye" />, onClick: (report) => handlePreview(report), show: () => canView },
    { label: 'Download', icon: <FaIcon icon="fa-download" />, onClick: (report) => handleDownload(report), show: () => canExport },
    { label: 'Delete', icon: <FaIcon icon="fa-trash" />, danger: true, onClick: (report) => handleDelete(report), show: () => canExport },
  ], [handlePreview, handleDownload, handleDelete, canView, canExport]);

  if (reportsQuery.isLoading) return <LoadingState text="Loading reports..." />;
  if (reportsQuery.isError) return <ErrorState title="Failed to load reports" description={errorMessage(reportsQuery.error)} onRetry={() => reportsQuery.refetch()} />;

  return (
    <PermissionGate permission={PERMISSION.REPORT_VIEW} fallback={<PermissionHint permission={PERMISSION.REPORT_VIEW} />}>
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Reports"
        description="Generate and download security reports."
        actions={
          <PermissionGate permission={PERMISSION.REPORT_EXPORT}>
            <Button type="primary" onClick={() => setGenerateOpen(true)} icon={<FaIcon icon="fa-plus" />}>
              Generate report
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        source={makeSource(reportsQuery.data)}
        columns={columns}
        rowKey={(r) => r.id}
        actions={actions}
        emptyText="No reports found. Generate a report to get started."
        isLoading={reportsQuery.isLoading}
        searchable
        searchPlaceholder="Search reports"
        searchValue={params.search}
        onSearchChange={setSearch}
        onChange={(p, ps) => setPagination(p, ps)}
      />

      <Modal
        title="Generate report"
        open={generateOpen}
        onOk={handleGenerate}
        onCancel={() => setGenerateOpen(false)}
        okText="Generate"
        okButtonProps={{ loading: generateMutation.isPending }}
      >
        <Flex vertical gap={token.paddingMD}>
          <Flex align="center" gap={token.paddingSM} style={{ padding: token.paddingSM, background: token.colorBgTextHover, borderRadius: token.borderRadiusLG }}>
            <FaIcon icon={REPORT_TYPE.icon} />
            <Flex vertical gap={0}>
              <Typography.Text strong>{REPORT_TYPE.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{REPORT_TYPE.description}</Typography.Text>
            </Flex>
          </Flex>

          <Flex gap={token.marginMD}>
            <Flex vertical flex={1} gap={4}>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Format</Typography.Text>
              <Select value={selectedFormat} onChange={setSelectedFormat} options={FORMAT_OPTIONS} style={{ width: '100%' }} />
            </Flex>
            <Flex vertical flex={1} gap={4}>
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Date Range</Typography.Text>
              <Select value={selectedRange} onChange={setSelectedRange} options={RANGE_OPTIONS} style={{ width: '100%' }} />
            </Flex>
          </Flex>
        </Flex>
      </Modal>

      <ReportPreviewModal
        open={previewOpen}
        report={selectedReport}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </Flex>
    </PermissionGate>
  );
}
