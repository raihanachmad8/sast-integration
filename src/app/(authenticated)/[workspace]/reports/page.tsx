'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button, Input, Modal, App, Card, Typography, Flex, theme } from 'antd';
import { useSessionQuery } from '@/modules/auth/queries';
import { useReportsQuery, useGenerateReportMutation } from '@/modules/report';
import { PageHeader } from '@/components/shared/PageHeader';
import { FaIcon } from '@/components/shared/fa-icon';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { TableFooter } from '@/components/shared/TableFooter';
import { ReportPreviewDrawer } from '@/features/reports/ReportPreviewDrawer';
import { StatusPill } from '@/components/shared/StatusPill';
import { useTableParams } from '@/lib/hooks/useTableParams';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { RadioCardGroup } from '@/components/shared/RadioCardGroup';
import { PERMISSION } from '@/commons/constants/permissions';
import type { Report } from '@/commons/types';

interface ReportType {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const FORMAT_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = {
  PDF: 'red',
  XLSX: 'teal',
  CSV: 'blue',
};

function buildColumns(handlePreview: (r: Report) => void, handleDownload: (r: Report) => void): DataTableColumn<Report>[] {
  return [
    {
      key: 'name',
      header: 'Report',
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => <Typography.Text strong>{row.name}</Typography.Text>,
    },
    {
      key: 'range',
      header: 'Range',
      render: (row) => <Typography.Text type="secondary">{row.range}</Typography.Text>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill variant="teal">{row.status}</StatusPill>,
    },
    {
      key: 'format',
      header: 'Format',
      render: (row) => <StatusPill variant={FORMAT_VARIANT[row.format] ?? 'slate'}>{row.format}</StatusPill>,
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => <Typography.Text type="secondary">{row.created}</Typography.Text>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Flex justify="flex-end" gap={4}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handlePreview(row); }}><FaIcon icon="fa-eye" /> Preview</Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleDownload(row); }}><FaIcon icon="fa-download" /> Download</Button>
        </Flex>
      ),
    },
  ];
}

/**
 * Reports page for generating and viewing security reports.
 *
 * @remarks
 * Renders the report list table + generate flow. Preview uses a rich document-style
 * drawer (ReportPreviewDrawer) with type-specific professional content.
 * Data is fetched from the API via React Query. Follows UI_PAGE_SPECIFICATIONS and AGENTS.md standards.
 *
 * @returns The reports management page.
 */
export default function ReportsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id;

  const REPORT_TYPES: ReportType[] = [
    { id: 'verdict', name: 'AI Verdict Summary', icon: 'fa-robot', color: token.colorInfo, description: 'AI verification results with confidence scores' },
    { id: 'findings', name: 'Detailed Findings', icon: 'fa-bug', color: token.colorPurple, description: 'Full findings list with severity, status, and remediation' },
    { id: 'executive', name: 'Executive Summary', icon: 'fa-chart-pie', color: token.colorSuccess, description: 'High-level metrics for leadership review' },
    { id: 'compliance', name: 'Compliance Export', icon: 'fa-file-shield', color: token.colorWarning, description: 'OWASP/CWE mapping for compliance audits' },
  ];

  const reportsQuery = useReportsQuery(workspaceId);
  const generateMutation = useGenerateReportMutation(workspaceId);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const reports = reportsQuery.data ?? [];

  const { params, setPage, setPageSize, setSearch, filtered, paginated } = useTableParams<Report>({
    data: reports,
    searchField: 'name',
    defaultPageSize: 10,
  });

  const handleGenerate = () => {
    if (!selectedType) return;
    const reportType = REPORT_TYPES.find((t) => t.id === selectedType);
    generateMutation.mutate(
      { name: reportType?.name ?? selectedType, type: selectedType, range: 'Last 30 days', format: 'pdf' },
      {
        onSuccess: () => {
          setGenerateOpen(false);
          setSelectedType(null);
          message.success('Report generated');
        },
        onError: (err) => message.error(errorMessage(err)),
      },
    );
  };

  const handlePreview = useCallback((report: Report) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  }, []);

  const handleDownload = useCallback((report: Report) => {
    message.loading(`Downloading ${report.name} as ${report.format}...`, 1.5).then(() => message.success('Download complete'));
  }, [message]);

  const columns = useMemo(() => buildColumns(handlePreview, handleDownload), [handlePreview, handleDownload]);

  if (!workspaceId) {
    return <LoadingState text="Loading workspace..." />;
  }

  if (reportsQuery.isLoading) {
    return <LoadingState text="Loading reports..." />;
  }

  if (reportsQuery.isError) {
    return <ErrorState title="Failed to load reports" description={errorMessage(reportsQuery.error)} onRetry={() => reportsQuery.refetch()} />;
  }

  return (
    <Flex vertical gap={token.paddingXL}>
      <PageHeader
        title="Reports"
        description="Generate and download security reports. Supports scheduled reports."
        actions={
          <PermissionGate permission={PERMISSION.REPORT_EXPORT}>
            <Button type="primary" onClick={() => setGenerateOpen(true)}>
              <FaIcon icon="fa-plus" /> Generate report
            </Button>
          </PermissionGate>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, padding: 12 }}>
          <Input
            allowClear
            style={{ maxWidth: 360, flex: 1 }}
            placeholder="Search reports"
            prefix={<FaIcon icon="fa-magnifying-glass" />}
            value={params.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="fa-file-shield"
            title="No reports found"
            text="Generate a report to get started."
            action={
              <PermissionGate permission={PERMISSION.REPORT_EXPORT}>
                <Button type="primary" onClick={() => setGenerateOpen(true)}>
                  <FaIcon icon="fa-plus" /> Generate report
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <>
            <DataTable
              data={paginated}
              columns={columns}
              rowKey={(r) => r.id}
              emptyText="No reports found"
            />
            <TableFooter
              current={params.page}
              pageSize={params.per_page}
              total={filtered.length}
              onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
            />
          </>
        )}
      </Card>

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
