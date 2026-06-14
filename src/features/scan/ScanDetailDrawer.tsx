'use client';

import { Drawer, Tabs, Typography, Descriptions, Statistic, Progress, Space, Card, Button, Flex, theme } from 'antd';
import { FaIcon } from '@/components/shared/FaIcon';
import { FindingItem } from './FindingItem';
import { ScanTimeline } from './ScanTimeline';
import type { ScanDetail, Finding } from './types';
import { StatusTag } from '@/components/shared/StatusTag';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';

const { Text } = Typography;

/** Props for ScanDetailDrawer. */
interface ScanDetailDrawerProps {
  /** Whether the drawer is visible. */
  open: boolean;
  /** Callback to close the drawer. */
  onClose: () => void;
  /** Scan detail data. */
  scan: ScanDetail | null;
  /** Findings for this scan. */
  findings?: Finding[];
  /** Findings query for loading state. */
  scanFindingsQuery?: { isLoading: boolean };
  /** Callback to view findings in full page. */
  onViewFindings?: (scanId: string) => void;
  /** Callback to retry a failed scan. */
  onRetry?: (scanId: string) => void;
}

/**
 * Format duration seconds to human-readable string.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Drawer showing detailed scan information with tabs for overview, findings, and timeline.
 */
export function ScanDetailDrawer({
  open,
  onClose,
  scan,
  findings = [],
  scanFindingsQuery,
  onViewFindings,
  onRetry,
}: ScanDetailDrawerProps) {
  const { token } = theme.useToken();
  if (!scan) {
    return (
      <Drawer open={open} onClose={onClose} title="Scan Details">
        <EmptyState title="No scan data available" />
      </Drawer>
    );
  }

  const severityTotal = Object.values(scan.severityBreakdown).reduce((a, b) => a + b, 0);
  const aiPercent = scan.aiStats
    ? Math.round((scan.aiStats.verified / scan.aiStats.total) * 100)
    : 0;

  return (
    <Drawer
      title={
        <Flex align="center" gap={token.marginMD}>
          <FaIcon icon="fa-microscope" style={{ fontSize: token.fontSizeXL, color: token.colorSuccess }} />
          <div>
            <div style={{ fontWeight: token.fontWeightStrong, fontSize: token.fontSizeXL }}>
              Scan Details
            </div>
            <Text type="secondary" style={{ fontSize: token.fontSize }}>
              {scan.repository} • {scan.branch}
            </Text>
          </div>
        </Flex>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ body: { padding: token.paddingXL } }}
      extra={
        <Space>
          {scan.status === 'failed' && onRetry && (
            <Button
              type="primary"
              onClick={() => onRetry(scan.id)}
            >
              <FaIcon icon="fa-rotate-right" /> Retry
            </Button>
          )}
        </Space>
      }
    >
      <Flex vertical gap={token.paddingLG}>
        {/* Status Header */}
        <Flex align="center" gap={token.marginMD} wrap="wrap">
          <StatusTag type="scanStatus" value={scan.status === 'completed' ? 'Completed' : scan.status === 'failed' ? 'Failed' : scan.status === 'processing' ? 'Running' : 'Pending'} />
          <StatusPill variant={scan.origin === 'managed' ? 'purple' : 'slate'}>
            <FaIcon icon={scan.origin === 'managed' ? 'fa-robot' : 'fa-cloud-arrow-up'} />{' '}
            {scan.origin === 'managed' ? 'Managed' : 'External Upload'}
          </StatusPill>
          {scan.durationSeconds != null && (
            <Typography.Text type="secondary">
              <FaIcon icon="fa-clock" /> {formatDuration(scan.durationSeconds)}
            </Typography.Text>
          )}
        </Flex>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginMD }}>
          <Card size="small">
            <Statistic title="Total Findings" value={scan.totalFindings} />
          </Card>
          <Card size="small">
            <Statistic title="Critical" value={scan.severityBreakdown.critical} styles={{ value: { color: token.colorError } }} />
          </Card>
          <Card size="small">
            <Statistic title="High" value={scan.severityBreakdown.high} styles={{ value: { color: token.colorWarning } }} />
          </Card>
          <Card size="small">
            <Statistic title="AI Verified" value={scan.aiStats?.verified ?? 0} styles={{ value: { color: token.colorSuccess } }} />
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: (
                <span><FaIcon icon="fa-chart-bar" /> Overview</span>
              ),
              children: (
                <Flex vertical gap={token.paddingLG}>
                  {/* Scan Info */}
                  <div>
                    <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: token.fontWeightStrong }}>Scan Information</Typography.Title>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="Scan ID"><Typography.Text code>{scan.id.slice(0, 8)}</Typography.Text></Descriptions.Item>
                      <Descriptions.Item label="Commit"><Typography.Text code>{scan.commitSha}</Typography.Text></Descriptions.Item>
                      <Descriptions.Item label="Started">{scan.startedAt}</Descriptions.Item>
                      <Descriptions.Item label="Completed">{scan.completedAt ?? '—'}</Descriptions.Item>
                    </Descriptions>
                  </div>

                  {/* Scanner Results */}
                  <div>
                    <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: token.fontWeightStrong }}>Scanner Results</Typography.Title>
                    <Card size="small" styles={{ body: { padding: 0 } }}>
                      {scan.scannerResults.map((result, i) => (
                        <Flex
                          key={result.scanner}
                          align="center"
                          justify="space-between"
                          style={{
                            padding: `${token.paddingSM}px ${token.paddingMD}px`,
                            borderBottom: i < scan.scannerResults.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined,
                          }}
                        >
                          <Flex align="center" gap={token.marginSM}>
                            <FaIcon
                              icon={result.status === 'completed' ? 'fa-circle-check' : result.status === 'failed' ? 'fa-circle-xmark' : 'fa-circle-minus'}
                              style={{ color: result.status === 'completed' ? token.colorSuccess : result.status === 'failed' ? token.colorError : token.colorTextQuaternary }}
                            />
                            <Typography.Text strong>{result.scanner}</Typography.Text>
                            {result.durationSeconds != null && (
                              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                                ({formatDuration(result.durationSeconds)})
                              </Typography.Text>
                            )}
                          </Flex>
                          <Flex align="center" gap={token.marginXS}>
                            <Typography.Text>{result.findingsCount} findings</Typography.Text>
                            {result.status === 'skipped' && (
                              <StatusPill variant="slate">Skipped</StatusPill>
                            )}
                          </Flex>
                        </Flex>
                      ))}
                    </Card>
                  </div>

                  {/* Severity Breakdown */}
                  {severityTotal > 0 && (
                    <div>
                      <Typography.Title level={5} style={{ marginBottom: token.marginMD, marginTop: 0, fontWeight: token.fontWeightStrong }}>Severity Distribution</Typography.Title>
                      <Card size="small">
                        <div style={{ display: 'flex', gap: token.paddingMD, flexWrap: 'wrap' }}>
                          {Object.entries(scan.severityBreakdown).map(([severity, count]) => (
                            <Flex key={severity} align="center" gap={token.marginXXS}>
                              <StatusTag type="severity" value={severity} />
                              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{count}</Typography.Text>
                            </Flex>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* View Findings Button */}
                  {scan.status === 'completed' && onViewFindings && (
                    <Button
                      type="primary"
                      block
                      icon={<FaIcon icon="fa-eye" />}
                      onClick={() => onViewFindings(scan.id)}
                    >
                      View Findings
                    </Button>
                  )}
                </Flex>
              ),
            },
            {
              key: 'findings',
              label: (
                <span><FaIcon icon="fa-bug" /> Findings ({scan.totalFindings})</span>
              ),
              children: (
                <Flex vertical gap={token.marginSM}>
                  {scanFindingsQuery?.isLoading ? (
                    <Flex vertical align="center" justify="center" style={{ padding: token.paddingXL, color: token.colorTextSecondary }}>
                      <div>Loading findings...</div>
                    </Flex>
                  ) : findings.length === 0 ? (
                    <Flex vertical align="center" justify="center" style={{ padding: token.paddingXL, color: token.colorTextSecondary }}>
                      <FaIcon icon="fa-shield-halved" style={{ fontSize: token.fontSizeHeading2, marginBottom: token.marginSM }} />
                      <div>No findings detected</div>
                    </Flex>
                  ) : (
                    <>
                      {/* AI Stats Banner */}
                      {scan.aiStats?.enabled && (
                        <Flex
                          align="center"
                          justify="space-between"
                          style={{
                            padding: `${token.paddingXS}px ${token.paddingSM}px`,
                            background: token.colorBgContainer,
                            borderRadius: token.borderRadiusLG,
                            border: `1px solid ${token.colorBorder}`,
                            flexWrap: 'wrap',
                            gap: token.marginSM,
                          }}
                        >
                          <Flex align="center" gap={token.marginXS}>
                            <FaIcon icon="fa-robot" style={{ color: token.colorPrimary }} />
                            <Typography.Text strong>AI Verification</Typography.Text>
                          </Flex>
                          <Flex align="center" gap={token.marginSM}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: token.fontWeightStrong }}>{scan.aiStats.verified}</div>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Verified</Text>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: token.fontWeightStrong, color: token.colorSuccess }}>{scan.aiStats.truePositives}</div>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>TP</Text>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: token.fontWeightStrong, color: token.colorTextSecondary }}>{scan.aiStats.falsePositives}</div>
                              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>FP</Text>
                            </div>
                            <Progress percent={aiPercent} size="small" style={{ width: 100 }} />
                          </Flex>
                        </Flex>
                      )}

                      {/* Findings List */}
                      {findings.map((finding) => (
                        <FindingItem key={finding.id} finding={finding} showAi />
                      ))}
                    </>
                  )}
                </Flex>
              ),
            },
            {
              key: 'timeline',
              label: (
                <span><FaIcon icon="fa-timeline" /> Timeline</span>
              ),
              children: <ScanTimeline events={scan.timeline} />,
            },
          ]}
        />
      </Flex>
    </Drawer>
  );
}
