'use client';

import { Drawer, Typography, Button, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/fa-icon';
import { StatusPill } from '@/components/shared/StatusPill';
import { SectionLabel } from '@/components/shared/SectionLabel';

const { Text, Title } = Typography;

const FORMAT_VARIANT: Record<string, string> = { PDF: 'red', XLSX: 'teal', CSV: 'blue' };

interface Report {
  id: string;
  title: string;
  range: string;
  status: string;
  format: string;
  created: string;
}

interface ReportPreviewDrawerProps {
  open: boolean;
  report: Report | null;
  onClose: () => void;
  onDownload: (report: Report) => void;
}

export function ReportPreviewDrawer({ open, report, onClose, onDownload }: ReportPreviewDrawerProps) {
  const { token } = theme.useToken();
  if (!report) return null;

  return (
    <Drawer
      title={`Preview: ${report.title}`}
      open={open}
      onClose={onClose}
      size="large"
      footer={
        <Flex justify="flex-end" gap={token.paddingMD}>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" onClick={() => { onDownload(report); onClose(); }}>
            <FaIcon icon="fa-download" /> Download {report.format}
          </Button>
        </Flex>
      }
    >
      <Flex gap={token.paddingXL} style={{ marginBottom: token.paddingXL }} wrap="wrap">
        <div>
          <SectionLabel>Range</SectionLabel>
          <div style={{ fontWeight: token.fontWeightStrong, color: token.colorText }}>{report.range}</div>
        </div>
        <div>
          <SectionLabel>Format</SectionLabel>
          <div><StatusPill variant={(FORMAT_VARIANT[report.format] ?? 'slate') as 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'}>{report.format}</StatusPill></div>
        </div>
        <div>
          <SectionLabel>Status</SectionLabel>
          <div><StatusPill variant="teal">{report.status}</StatusPill></div>
        </div>
        <div>
          <SectionLabel>Created</SectionLabel>
          <div style={{ color: token.colorTextSecondary }}>{report.created}</div>
        </div>
      </Flex>

      <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: token.paddingXL, background: token.colorBgLayout }}>
        <Title level={4} style={{ margin: `0 0 ${token.paddingLG}`, fontWeight: token.fontWeightStrong }}>Report Preview</Title>
        {report.title === 'AI Verdict Summary' && (
          <Flex vertical gap={token.marginMD}>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>Total findings reviewed</Text><Text strong>24</Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>True positives</Text><Text strong style={{ color: token.colorError }}>18</Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>False positives</Text><Text strong style={{ color: token.colorSuccess }}>6</Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>Average confidence</Text><Text strong>92%</Text>
            </Flex>
          </Flex>
        )}
        {report.title === 'Executive Summary' && (
          <Flex vertical gap={token.marginMD}>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>Repositories scanned</Text><Text strong>12</Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>Total scans</Text><Text strong>48</Text>
            </Flex>
            <Flex justify="space-between" style={{ padding: token.paddingMD, background: token.colorBgContainer, borderRadius: token.borderRadius }}>
              <Text>Critical findings</Text><Text strong style={{ color: token.colorError }}>3</Text>
            </Flex>
          </Flex>
        )}
        {(report.title === 'Detailed Findings Export' || report.title === 'Compliance Export') && (
          <div style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
            Full report content available after download.
          </div>
        )}
      </div>
    </Drawer>
  );
}
