'use client';

import { Typography, theme } from 'antd';
import type { ScanPolicy } from './NewScanModal';

const { Text } = Typography;

interface ScanSummaryProps {
  repoName: string | undefined;
  providerLabel: string | undefined;
  branch: string | undefined;
  selectedPolicy: ScanPolicy | undefined;
  profile: string | undefined;
  scanners: string[];
  scannerLabels: Record<string, string>;
}

export function ScanSummary({
  repoName,
  providerLabel,
  branch,
  selectedPolicy,
  profile,
  scanners,
  scannerLabels,
}: ScanSummaryProps) {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        padding: `${token.paddingMD}px ${token.paddingLG}px`,
        background: token.colorBgLayout,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div
        style={{
          fontSize: token.fontSize,
          fontWeight: token.fontWeightStrong,
          color: token.colorTextSecondary,
          marginBottom: token.paddingSM,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Scan Summary
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: token.paddingSM,
          fontSize: token.fontSize,
        }}
      >
        <div>
          <Text type="secondary">Repository:</Text> <strong>{repoName}</strong>
        </div>
        <div>
          <Text type="secondary">Provider:</Text> <strong>{providerLabel}</strong>
        </div>
        <div>
          <Text type="secondary">Branch:</Text> <strong>{branch}</strong>
        </div>
        <div>
          <Text type="secondary">Policy:</Text>{' '}
          <strong>{selectedPolicy?.name ?? 'None'}</strong>
        </div>
        <div>
          <Text type="secondary">Profile:</Text>{' '}
          <strong>{profile}</strong>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Text type="secondary">Scanners:</Text>{' '}
          <strong>
            {scanners
              .map((s) => scannerLabels[s] ?? s)
              .join(', ') || 'None'}
          </strong>
        </div>
      </div>
    </div>
  );
}
