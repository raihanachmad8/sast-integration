'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, App, Typography, Flex, Select, theme } from 'antd';
import { useReportsQuery, useGenerateReportMutation, useDeleteReportMutation } from '@/modules/reports';
import { reportsApi } from '@/modules/reports/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/FaIcon';
import { DataTable, makeSource, type DataTableColumn, type ActionConfig } from '@/components/shared/DataTable';
import { ReportPreviewDrawer } from '@/features/reports/ReportPreviewDrawer';
import { StatusPill } from '@/components/shared/StatusPill';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { RadioCardGroup } from '@/components/shared/RadioCardGroup';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { PERMISSION } from '@/commons/constants/permissions';
import { errorMessage } from '@/lib/api/errors';
import { useWorkspace } from '@/hooks/use-workspace';
import type { ReportRow } from '@/commons/types/reports';

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
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { confirm } = useConfirm();
  const { workspaceId } = useWorkspace();

  const REPORT_TYPES = [
    { id: 'verdict', name: 'AI Verdict Summary', icon: 'fa-robot', description: 'AI verification results with confidence scores' },
    { id: 'findings', name: 'Detailed Findings', icon: 'fa-bug', description: 'Full findings list with severity and remediation' },
    { id: 'executive', name: 'Executive Summary', icon: 'fa-chart-pie', description: 'High-level metrics for leadership review' },
    { id: 'compliance', name: 'Compliance Export', icon: 'fa-file-shield', description: 'OWASP/CWE mapping for compliance audits' },
  ];

  const { params, setPage, setPageSize, setSearch } = useTableParams({
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
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [selectedRange, setSelectedRange] = useState<string>('Last 30 days');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const handleGenerate = () => {
    if (!selectedType) return;
    const rt = REPORT_TYPES.find((t) => t.id === selectedType);
    generateMutation.mutate(
      { type: selectedType, title: rt?.name ?? selectedType, format: selectedFormat, range: selectedRange },
      {
        onSuccess: () => { setGenerateOpen(false); setSelectedType(null); message.success('Report generated'); },
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
    { label: 'Preview', icon: <FaIcon icon="fa-eye" />, onClick: (report) => handlePreview(report) },
    { label: 'Download', icon: <FaIcon icon="fa-download" />, onClick: (report) => handleDownload(report) },
    { label: 'Delete', icon: <FaIcon icon="fa-trash" />, danger: true, onClick: (report) => handleDelete(report) },
  ], [handlePreview, handleDownload, handleDelete]);

  if (reportsQuery.isLoading) return <LoadingState text="Loading reports..." />;
  if (reportsQuery.isError) return <ErrorState title="Failed to load reports" description={errorMessage(reportsQuery.error)} onRetry={() => reportsQuery.refetch()} />;

  return (
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
        onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
      />

      <Modal
        title="Generate report"
        open={generateOpen}
        onOk={handleGenerate}
        onCancel={() => { setGenerateOpen(false); setSelectedType(null); }}
        okText="Generate"
        okButtonProps={{ disabled: !selectedType, loading: generateMutation.isPending }}
      >
        <Flex vertical gap={token.paddingMD}>
          <RadioCardGroup
            ariaLabel="Report type"
            columns={2}
            options={REPORT_TYPES.map((t) => ({ key: t.id, label: t.name, description: t.description, icon: <FaIcon icon={t.icon} /> }))}
            value={selectedType}
            onChange={(id) => setSelectedType(id)}
          />

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

      <ReportPreviewDrawer
        open={previewOpen}
        report={selectedReport}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </Flex>
  );
}
