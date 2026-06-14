'use client';

import { Drawer, Typography, Descriptions, Flex, Button, Card, theme } from 'antd';
import { StatusPill } from '@/components/shared/StatusPill';
import { FaIcon } from '@/components/shared/FaIcon';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ReportRow } from '@/commons/types/reports';

const { Text, Title } = Typography;

const FORMAT_VARIANT: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'> = {
  pdf: 'red',
  xlsx: 'teal',
  csv: 'blue',
  json: 'purple',
};

const TYPE_LABELS: Record<string, string> = {
  verdict: 'AI Verdict Summary',
  findings: 'Detailed Findings',
  executive: 'Executive Summary',
  compliance: 'Compliance Export',
};

interface ReportPreviewDrawerProps {
  open: boolean;
  report: ReportRow | null;
  onClose: () => void;
  onDownload: (report: ReportRow) => void;
}

export function ReportPreviewDrawer({ open, report, onClose, onDownload }: ReportPreviewDrawerProps) {
  const { token } = theme.useToken();

  if (!report) {
    return (
      <Drawer open={open} onClose={onClose} title="Report Preview">
        <EmptyState title="No report data available" />
      </Drawer>
    );
  }

  const filters = (typeof report.filters === 'object' && report.filters !== null ? report.filters : {}) as Record<string, unknown>;

  return (
    <Drawer
      title={report.title}
      open={open}
      onClose={onClose}
      size="default"
      footer={
        <Flex justify="flex-end" gap={token.marginSM}>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" icon={<FaIcon icon="fa-download" />} onClick={() => onDownload(report)}>
            Download
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={token.paddingLG}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Type">{TYPE_LABELS[report.type] ?? report.type}</Descriptions.Item>
          <Descriptions.Item label="Format">
            <StatusPill variant={FORMAT_VARIANT[report.format ?? ''] ?? 'slate'}>
              {(report.format ?? '—').toUpperCase()}
            </StatusPill>
          </Descriptions.Item>
          <Descriptions.Item label="Author">{report.createdByName ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Date">{new Date(report.createdAt).toLocaleDateString()}</Descriptions.Item>
          {report.fileSize && (
            <Descriptions.Item label="Size">{(report.fileSize / 1024).toFixed(1)} KB</Descriptions.Item>
          )}
          {typeof filters.range === 'string' && (
            <Descriptions.Item label="Date Range">{filters.range}</Descriptions.Item>
          )}
        </Descriptions>

        <Card styles={{ body: { padding: token.paddingLG } }}>
          <Flex vertical gap={token.marginSM} align="center">
            <FaIcon icon="fa-file-lines" style={{ fontSize: 48, color: token.colorTextQuaternary }} />
            <Text type="secondary" style={{ textAlign: 'center' }}>
              Click Download to get the full report content.
            </Text>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM, textAlign: 'center' }}>
              The report will be generated in {report.format?.toUpperCase() ?? 'PDF'} format.
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Drawer>
  );
}
