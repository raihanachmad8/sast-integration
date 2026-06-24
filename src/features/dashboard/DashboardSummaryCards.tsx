'use client';

import { Card, Col, Row, Typography, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';

interface DashboardSummaryCardsProps {
  connectedRepos: number;
  activeScans: number;
  criticalFindings: number;
  awaitingAi: number;
}

/**
 * Summary cards showing key workspace statistics.
 *
 * @example
 * <DashboardSummaryCards connectedRepos={3} activeScans={1} criticalFindings={4} awaitingAi={6} />
 */
export function DashboardSummaryCards({ connectedRepos = 0, activeScans = 0, criticalFindings = 0, awaitingAi = 0 }: DashboardSummaryCardsProps) {
  const { token } = theme.useToken();
  const values = [connectedRepos, activeScans, criticalFindings, awaitingAi];
  const items = [
    { label: 'Connected repositories', icon: 'fa-code-branch', color: token.colorSuccess, bg: token.colorSuccessBg },
    { label: 'Active scans', icon: 'fa-rotate', color: token.colorPrimary, bg: token.colorPrimaryBg },
    { label: 'Critical findings', icon: 'fa-triangle-exclamation', color: token.colorError, bg: token.colorErrorBg },
    { label: 'Awaiting AI', icon: 'fa-brain', color: token.colorPurple, bg: token.colorPurpleBg },
  ];

  return (
    <Row gutter={[token.marginMD, token.marginMD]}>
      {items.map((item, i) => (
        <Col key={item.label} xs={24} sm={12} lg={6}>
          <Card styles={{ body: { padding: token.paddingLG } }} style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>{item.label}</Typography.Text>
                <div style={{ fontSize: token.fontSizeHeading1, fontWeight: token.fontWeightStrong, lineHeight: 1.2, marginTop: token.marginXS }}>{values[i]}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: token.borderRadiusLG, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaIcon icon={item.icon} style={{ color: item.color, fontSize: token.fontSizeLG }} />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
