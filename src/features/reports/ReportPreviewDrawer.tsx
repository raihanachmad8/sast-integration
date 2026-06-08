'use client';

import { Drawer, Typography, Button, Flex, Card, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { StatusPill } from '@/components/shared/StatusPill';
import { SectionLabel } from '@/components/shared/SectionLabel';
import type { ReportRow } from '@/commons/types/reports';

const FORMAT_VARIANT: Record<string, string> = { pdf: 'red', json: 'blue', csv: 'slate' };

interface ReportPreviewDrawerProps { open: boolean; report: ReportRow | null; onClose: () => void; onDownload: (report: ReportRow) => void; }

/**
 * Drawer showing report preview with metadata and content summary.
 *
 * @example
 * <ReportPreviewDrawer open={true} report={r} onClose={fn} onDownload={fn} />
 */
export function ReportPreviewDrawer({ open, report, onClose, onDownload }: ReportPreviewDrawerProps) {
  const { token } = theme.useToken();
  if (!report) return null;

  return (
    <Drawer title={`Preview: ${report.title}`} open={open} onClose={onClose} size="large"
      footer={<Flex justify="flex-end" gap={token.paddingMD}><Button onClick={onClose}>Close</Button><Button type="primary" onClick={() => { onDownload(report); onClose(); }} icon={<FaIcon icon="fa-download" />}>Download</Button></Flex>}
    >
      <Flex gap={token.paddingXL} style={{ marginBottom: token.paddingXL }} wrap="wrap">
        <div><SectionLabel>Title</SectionLabel><Typography.Text strong>{report.title}</Typography.Text></div>
        <div><SectionLabel>Type</SectionLabel><Typography.Text type="secondary">{report.type}</Typography.Text></div>
        <div><SectionLabel>Format</SectionLabel><StatusPill variant={(FORMAT_VARIANT[report.format ?? ''] ?? 'slate') as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{(report.format ?? '—').toUpperCase()}</StatusPill></div>
        <div><SectionLabel>Date</SectionLabel><Typography.Text type="secondary">{new Date(report.createdAt).toLocaleDateString()}</Typography.Text></div>
      </Flex>
      <Card size="small" styles={{ body: { padding: token.paddingXL } }}>
        <Typography.Title level={4} style={{ margin: `0 0 ${token.paddingLG}` }}>Report Preview</Typography.Title>
        <Typography.Text type="secondary">Full report content available after download.</Typography.Text>
      </Card>
    </Drawer>
  );
}
