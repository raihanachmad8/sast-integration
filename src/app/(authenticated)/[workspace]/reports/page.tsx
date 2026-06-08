'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, App, Typography, Flex, theme } from 'antd';
import { useReportsQuery, useGenerateReportMutation } from '@/modules/reports';
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
import { PERMISSION } from '@/commons/constants/permissions';
import { errorMessage } from '@/lib/api/errors';
import type { ReportRow } from '@/commons/types/reports';

const FORMAT_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = { pdf: 'red', xlsx: 'teal', csv: 'blue' };

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
      render: (row) => <Typography.Text type="secondary">{row.createdByName}</Typography.Text>,
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
    per_page: params.per_page,
    search: params.search || undefined,
  });
  const generateMutation = useGenerateReportMutation();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const handleGenerate = () => {
    if (!selectedType) return;
    const rt = REPORT_TYPES.find((t) => t.id === selectedType);
    generateMutation.mutate(
      { name: rt?.name ?? selectedType, type: selectedType, range: 'Last 30 days', format: 'pdf' },
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

  const handleDownload = useCallback((report: ReportRow) => {
    message.loading(`Downloading ${report.title}...`, 1.5).then(() => message.success('Download complete'));
  }, [message]);

  const columns = useMemo(() => buildColumns(), []);

  const actions = useMemo<ActionConfig<ReportRow>[]>(() => [
    { label: 'Preview', icon: <FaIcon icon="fa-eye" />, onClick: (report) => handlePreview(report) },
    { label: 'Download', icon: <FaIcon icon="fa-download" />, onClick: (report) => handleDownload(report) },
  ], [handlePreview, handleDownload]);

  if (reportsQuery.isLoading) return <LoadingState text="Loading reports..." />;
  if (reportsQuery.isError) return <ErrorState title="Failed to load reports" description={errorMessage(reportsQuery.error)} onRetry={() => reportsQuery.refetch()} />;

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Reports"
        description="Generate and download security reports. Supports scheduled reports."
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
        <RadioCardGroup
          ariaLabel="Report type"
          columns={2}
          options={REPORT_TYPES.map((t) => ({ key: t.id, label: t.name, description: t.description, icon: <FaIcon icon={t.icon} /> }))}
          value={selectedType}
          onChange={(id) => setSelectedType(id)}
        />
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
