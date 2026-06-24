'use client';

import { Card, Row, Col, Typography, Flex, theme } from 'antd';
import { FaIcon } from '@/commons/components/FaIcon';
import { STATUS_TOKENS } from '@/commons/constants/tokens';
import type { ScanRow } from './types';

interface ScanSummaryCardsProps {
  scans: ScanRow[];
}

export function ScanSummaryCards({ scans }: ScanSummaryCardsProps) {
  const { token } = theme.useToken();

  const STATUS_ITEMS = [
    { key: 'running', label: 'Running', icon: 'fa-spinner', color: token.colorSuccess, bg: token.colorTealDeepBg },
    { key: 'done', label: 'Done', icon: 'fa-circle-check', color: token.colorSuccess, bg: token.colorTealBg },
    { key: 'failed', label: 'Failed', icon: 'fa-circle-xmark', color: token.colorError, bg: STATUS_TOKENS.scanStatus.Failed.bg },
  ];

  const ORIGIN_ITEMS = [
    { key: 'managed', label: 'Managed', icon: 'fa-robot', color: token.colorSuccess, bg: token.colorTealDeepBg },
    { key: 'upload', label: 'Upload', icon: 'fa-cloud-arrow-up', color: token.colorTextSecondary, bg: token.colorBgLayout },
  ];
  const running = scans.filter(s => s.status === 'Running').length;
  const completed = scans.filter(s => s.status === 'Completed').length;
  const failed = scans.filter(s => s.status === 'Failed').length;
  const managed = scans.filter(s => s.origin === 'managed').length;
  const external = scans.filter(s => s.origin === 'external_upload').length;

  const statusValues = [running, completed, failed];
  const originValues = [managed, external];

  return (
    <Row gutter={[token.marginMD, token.marginMD]}>
      <Col xs={24} sm={24} md={8}>
        <Card size="small" style={{ height: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginXS }}>Total scans</Typography.Text>
          <div style={{ fontSize: token.fontSizeHeading1, fontWeight: token.fontWeightStrong, lineHeight: 1 }}>{scans.length}</div>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>In this workspace</Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={24} md={8}>
        <Card size="small" style={{ height: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginMD }}>By status</Typography.Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {STATUS_ITEMS.map((item, i) => (
              <Flex key={item.key} align="center" gap={token.marginXS}>
                <div style={{ width: 28, height: 28, borderRadius: token.borderRadiusSM, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaIcon icon={item.icon} style={{ color: item.color, fontSize: token.fontSizeSM }} />
                </div>
                <div>
                  <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, lineHeight: 1 }}>{statusValues[i]}</div>
                  <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{item.label}</div>
                </div>
              </Flex>
            ))}
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={24} md={8}>
        <Card size="small" style={{ height: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, display: 'block', marginBottom: token.marginMD }}>By origin</Typography.Text>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
            {ORIGIN_ITEMS.map((item, i) => (
              <Flex key={item.key} align="center" gap={token.marginXS}>
                <div style={{ width: 28, height: 28, borderRadius: token.borderRadiusSM, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaIcon icon={item.icon} style={{ color: item.color, fontSize: token.fontSizeSM }} />
                </div>
                <div>
                  <div style={{ fontSize: token.fontSizeHeading4, fontWeight: token.fontWeightStrong, lineHeight: 1 }}>{originValues[i]}</div>
                  <div style={{ fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>{item.label}</div>
                </div>
              </Flex>
            ))}
          </div>
        </Card>
      </Col>
    </Row>
  );
}
